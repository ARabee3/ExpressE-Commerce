# Vercel Deployment Checklist

Your project is now configured for Vercel Serverless deployment.

## 1. Environment Variables
In your Vercel Project Settings > Environment Variables, add the following (copy values from your `.env`):
- `MONGODB_URI`
- `REDIS_URL` (Use a cloud-hosted Redis like Upstash or Redis Cloud)
- `JWT_SECRET` (and any other secrets)
- `STRIPE_SECRET_KEY` (if used)
- `EMAIL_USER`, `EMAIL_PASS` (for nodemailer)

## 2. File Uploads (Critical Change)
Vercel serverless functions have a **Read-Only File System**. You cannot save uploaded files to `uploads/` folder.

We changed `Multer` to use `memoryStorage()`.
- The uploaded file is now available in `req.file.buffer` or `req.files[i].buffer`.
- **Action Required:** Update your Controllers (e.g., `product.controller.js`) to take this buffer and upload it to a cloud storage service like **Cloudinary**, **AWS S3**, or **Firebase Storage**.
- If you don't do this, the file upload will succeed in memory but disappear immediately when the request finishes.

## 3. Database Connections
- Designed to reuse connections.
- Ensure your MongoDB Atlas IP Access List allows `0.0.0.0/0` (allow from anywhere) because Vercel IP addresses change dynamically.

## 4. Cold Starts
- The first request after a period of inactivity might be slower (Cold Start) as it connects to DB and Redis. Subsequent requests will be fast.
