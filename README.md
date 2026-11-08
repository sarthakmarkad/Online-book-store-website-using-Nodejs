# BookHaven Online Book Store

A responsive online bookstore built with Node.js, Express, EJS, and SQLite.

## Features

- Home page with featured books and book categories
- Search and category filtering
- Book detail pages
- Session-backed shopping cart with add, quantity update, remove, clear, and subtotal
- User registration, password hashing, login, logout, and account page
- SQLite database automatically created and seeded on first run
- Server-side validation and friendly error pages
- Responsive layout for desktop, tablet, and mobile screens

## Run locally

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). Set `PORT` or `SESSION_SECRET` environment variables to customize the server.

## Database

The application is connected to the SQLite database file [`bookstore.db`](./bookstore.db).
On startup, `server.js` creates the `users` and `books` tables if they do not exist and
seeds the sample books for a new database. The reproducible schema and sample data are
also available in [`database.sql`](./database.sql).

To use another SQLite file:

```bash
DATABASE_PATH=/absolute/path/to/bookstore.db npm start
```

User passwords are hashed with bcrypt before they are stored. Shopping cart contents are
kept in the user's session; user and book records are stored in SQLite.

## Project structure

- `server.js` - Express server, routes, validation, sessions, and database initialization
- `views/` - EJS pages and shared layout partials
- `public/styles.css` - Responsive UI styles
- `database.sql` - Reproducible SQLite schema and sample book data
- `package.json` - Node.js scripts and dependencies
