# MuunganoHub Database

This folder contains the MySQL database setup for MuunganoHub.

## Setup

1. Create the database and tables:

```powershell
mysql -u root -p < database\schema.sql
```

2. Add your MySQL settings to `.env` in the project root:

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=muunganohub
```

The backend also creates the database tables automatically on startup if the
MySQL user has permission.

## Formspree Registration Email

Add your Formspree endpoint to `.env`:

```env
FORMSPREE_ENDPOINT=https://formspree.io/f/your_form_id
```

When a user registers, the backend sends a welcome message through Formspree.
If `FORMSPREE_ENDPOINT` is empty, registration still works and email sending is skipped.
