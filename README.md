# MH Mini Mart - Shop Setup Guide

This guide explains how to install and run the MH Mini Mart POS system on a brand new Windows computer at your physical shop.

## 1. Prerequisites (What to download)
Before you begin, download the following free software on the new shop PC:
1. **XAMPP (PHP 8.2+)**: For the local server and database.
2. **QZ Tray**: For silent, instant receipt and barcode printing.

---

## 2. Setup XAMPP & Database
1. Install **XAMPP** (leave all default settings, it will install to `C:\xampp`).
2. Open the **XAMPP Control Panel** and start **Apache** and **MySQL**.
3. Open your browser and go to: `http://localhost/phpmyadmin`
4. Click **New** on the left sidebar.
5. Create a database named exactly: `mh_mini_mart` (leave the collation as `utf8mb4_general_ci`).
6. Click on the new `mh_mini_mart` database, go to the **Import** tab at the top.
7. Click **Choose File** and select `database/schema.sql` from this project folder.
8. Click **Import** at the bottom.

---

## 3. Copy the Project Files
1. Copy this entire project folder (`mh-mini-mart`).
2. Go to `C:\xampp\htdocs\` on the new PC.
3. Paste the folder there so the path looks like: `C:\xampp\htdocs\mh-mini-mart\`

---

## 4. Setup Printing (QZ Tray)
1. Install **QZ Tray** on the computer.
2. Make sure QZ Tray is running (you should see a small green square icon in your Windows system tray near the clock).
3. Connect your Receipt Printer and Barcode Printer via USB.
4. Install their Windows drivers so they show up in your "Printers & Scanners" list.

---

## 5. Prepare the Application for Production
To make the application run without needing Node.js or terminal commands every day, you need to "build" the frontend once on your current development PC before copying it, OR install Node.js on the shop PC.

**The easiest way (Do this on your current PC before copying to USB):**
1. Open the terminal in the `frontend` folder.
2. Run `npm run build`.
3. This creates a `dist` folder containing the optimized application.

**Accessing the App on the Shop PC:**
- **Backend API:** `http://localhost/mh-mini-mart/backend/api/`
- **Frontend App:** `http://localhost/mh-mini-mart/frontend/dist/`

> **Note:** To make the frontend routing work perfectly out of the `dist` folder on Apache, you will need a `.htaccess` file in that folder. 
> To make it easier for the shop staff, you can create a desktop shortcut directly to `http://localhost/mh-mini-mart/frontend/dist/`.

---

## 6. Daily Usage
Every morning, the shop operator just needs to:
1. Open the **XAMPP Control Panel** and ensure Apache and MySQL are **Start**ed.
2. Ensure **QZ Tray** is running.
3. Open their browser to the app bookmark.

## Default Credentials
- **Admin**: Create one manually or use the seeded one if available.
