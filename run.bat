@echo off
REM One-click Windows setup, same pattern as the restaurant project.
REM 1. Copy backend\.env.example to backend\.env if you do not have backend\.env yet.
REM 2. In backend\.env, set DB_PASSWORD to your MySQL root password.
REM    DB_PORT is 3307 in this copy because that is the port your restaurant
REM    project used. If your MySQL actually runs on 3306, change DB_PORT in
REM    .env to 3306. Do NOT use mysql.exe or schema.sql manually anymore -
REM    npm run setup does it.
REM 3. Double-click this file, then open http://localhost:5000/
cd /d %~dp0backend
call npm install
call npm run check
call npm run setup
call npm start
pause
