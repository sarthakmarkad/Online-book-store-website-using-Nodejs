const path = require("node:path");
const sqlite3 = require("sqlite3").verbose();
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");

const app = express();
const port = process.env.PORT || 3000;
const database = new sqlite3.Database(
  process.env.DATABASE_PATH || path.join(__dirname, "bookstore.db")
);
const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    database.run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve(this);
    });
  });
const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    database.get(sql, params, (error, row) => (error ? reject(error) : resolve(row)));
  });
const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    database.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)));
  });

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "bookhaven-development-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 4 }
  })
);
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.currentPath = req.path;
  res.locals.cartCount = Object.values(req.session.cart || {}).reduce((total, quantity) => total + quantity, 0);
  next();
});

function validateCredentials(email, password) {
  const errors = [];
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Enter a valid email address.");
  }
  if (!password || password.length < 6) {
    errors.push("Password must be at least 6 characters.");
  }
  return errors;
}

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login?message=Please+sign+in+first");
  next();
}

function getCart(req) {
  if (!req.session.cart) req.session.cart = {};
  return req.session.cart;
}

app.post("/cart/add", async (req, res, next) => {
  try {
    const book = await get("SELECT id FROM books WHERE id = ?", [req.body.bookId]);
    if (!book) return res.status(404).render("error", { title: "Book not found", message: "We could not add that book to your cart." });
    const cart = getCart(req);
    const bookId = String(book.id);
    cart[bookId] = (cart[bookId] || 0) + 1;
    res.redirect(req.get("Referrer") || `/books/${book.id}`);
  } catch (error) {
    next(error);
  }
});

app.get("/cart", async (req, res, next) => {
  try {
    const cart = getCart(req);
    const ids = Object.keys(cart);
    const books = ids.length ? await all(`SELECT * FROM books WHERE id IN (${ids.map(() => "?").join(",")})`, ids) : [];
    const items = books.map((book) => ({ ...book, quantity: cart[String(book.id)] })).filter((book) => book.quantity > 0);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    res.render("cart", { items, total });
  } catch (error) {
    next(error);
  }
});

app.post("/cart/update", async (req, res, next) => {
  try {
    const book = await get("SELECT id FROM books WHERE id = ?", [req.body.bookId]);
    const quantity = Number.parseInt(req.body.quantity, 10);
    if (!book || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return res.status(400).redirect("/cart");
    }
    getCart(req)[String(book.id)] = quantity;
    res.redirect("/cart");
  } catch (error) {
    next(error);
  }
});

app.post("/cart/remove", (req, res) => {
  delete getCart(req)[String(req.body.bookId)];
  res.redirect("/cart");
});

app.post("/cart/clear", (req, res) => {
  req.session.cart = {};
  res.redirect("/cart");
});

app.get("/", async (req, res, next) => {
  try {
    const books = await all("SELECT * FROM books ORDER BY featured DESC, title LIMIT 6");
    const categories = await all("SELECT DISTINCT category FROM books ORDER BY category");
    res.render("home", { books, categories });
  } catch (error) {
    next(error);
  }
});

app.get("/books", async (req, res, next) => {
  try {
    const search = (req.query.search || "").trim();
    const category = (req.query.category || "").trim();
    let query = "SELECT * FROM books WHERE 1 = 1";
    const params = [];
    if (search) {
      query += " AND (title LIKE ? OR author LIKE ? OR description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) {
      query += " AND category = ?";
      params.push(category);
    }
    query += " ORDER BY featured DESC, title";
    const books = await all(query, params);
    const categories = await all("SELECT DISTINCT category FROM books ORDER BY category");
    res.render("books", { books, categories, search, category });
  } catch (error) {
    next(error);
  }
});

app.get("/books/:id", async (req, res, next) => {
  try {
    const book = await get("SELECT * FROM books WHERE id = ?", [req.params.id]);
    if (!book) return res.status(404).render("error", { title: "Book not found", message: "We could not find that book." });
    res.render("book-detail", { book });
  } catch (error) {
    next(error);
  }
});

app.get("/register", (req, res) => {
  res.render("auth", { mode: "register", errors: [], values: {} });
});

app.post("/register", async (req, res, next) => {
  const name = (req.body.name || "").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";
  const errors = validateCredentials(email, password);
  if (!name || name.length < 2) errors.push("Name must contain at least 2 characters.");
  if (errors.length) return res.status(400).render("auth", { mode: "register", errors, values: { name, email } });
  try {
    const existing = await get("SELECT id FROM users WHERE email = ?", [email]);
    if (existing) return res.status(409).render("auth", { mode: "register", errors: ["An account with this email already exists."], values: { name, email } });
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await run("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)", [name, email, passwordHash]);
    req.session.user = { id: result.lastID, name, email };
    res.redirect("/account");
  } catch (error) {
    next(error);
  }
});

app.get("/login", (req, res) => {
  res.render("auth", { mode: "login", errors: req.query.message ? [req.query.message] : [], values: {} });
});

app.post("/login", async (req, res, next) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";
  const errors = validateCredentials(email, password);
  if (errors.length) return res.status(400).render("auth", { mode: "login", errors, values: { email } });
  try {
    const user = await get("SELECT * FROM users WHERE email = ?", [email]);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).render("auth", { mode: "login", errors: ["Email or password is incorrect."], values: { email } });
    }
    req.session.user = { id: user.id, name: user.name, email: user.email };
    res.redirect("/account");
  } catch (error) {
    next(error);
  }
});

app.post("/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.redirect("/");
  });
});

app.get("/account", requireAuth, async (req, res, next) => {
  try {
    const user = await get("SELECT id, name, email, created_at FROM users WHERE id = ?", [req.session.user.id]);
    res.render("account", { account: user });
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => res.status(404).render("error", { title: "Page not found", message: "The page you requested does not exist." }));
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).render("error", { title: "Something went wrong", message: "Please try again in a moment." });
});

async function initializeDatabase() {
  await run("PRAGMA foreign_keys = ON");
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  await run(`CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL CHECK (price >= 0),
    description TEXT NOT NULL,
    cover TEXT NOT NULL,
    featured INTEGER NOT NULL DEFAULT 0
  )`);
  const { count } = await get("SELECT COUNT(*) AS count FROM books");
  if (count === 0) {
    const books = [
      ["Atomic Habits", "James Clear", "Self Development", 499, "A practical guide to building good habits and breaking bad ones.", "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80", 1],
      ["The Psychology of Money", "Morgan Housel", "Finance", 399, "Timeless lessons on wealth, greed, and happiness.", "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80", 1],
      ["Ikigai", "Hector Garcia", "Lifestyle", 299, "The Japanese secret to a long and happy life.", "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80", 1],
      ["Clean Code", "Robert C. Martin", "Technology", 699, "A handbook of agile software craftsmanship.", "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=600&q=80", 0],
      ["The Alchemist", "Paulo Coelho", "Fiction", 249, "A shepherd's journey toward a worldly treasure and a personal legend.", "https://images.unsplash.com/photo-1511108690759-009cbe9f5c2b?auto=format&fit=crop&w=600&q=80", 0],
      ["Wings of Fire", "A. P. J. Abdul Kalam", "Biography", 349, "An inspiring story of vision, perseverance, and achievement.", "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=600&q=80", 0]
    ];
    for (const book of books) {
      await run("INSERT INTO books (title, author, category, price, description, cover, featured) VALUES (?, ?, ?, ?, ?, ?, ?)", book);
    }
  }
}

initializeDatabase().then(() => {
  app.listen(port, () => console.log(`BookHaven running at http://localhost:${port}`));
}).catch((error) => {
  console.error("Database initialization failed:", error);
  process.exitCode = 1;
});
