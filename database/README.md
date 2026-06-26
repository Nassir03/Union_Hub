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
