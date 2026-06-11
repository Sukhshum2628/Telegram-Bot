const express = require('express');
const router = express.Router();
const Hotel = require('../models/Hotel');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const SubscriptionLog = require('../models/SubscriptionLog');
const Lead = require('../models/Lead');
const logger = require('../utils/logger');

// Auth Middleware
const isAdmin = (req, res, next) => {
    if (req.session.isLoggedIn) return next();
    res.redirect('/admin/login');
};

// Login Route
router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_PANEL_USER && password === process.env.ADMIN_PANEL_PASS) {
        req.session.isLoggedIn = true;
        res.redirect('/admin/dashboard');
    } else {
        res.render('login', { error: 'Invalid credentials' });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// Dashboard
router.get('/dashboard', isAdmin, async (req, res) => {
    try {
        const stats = {
            totalUsers: await User.countDocuments(),
            premiumUsers: await User.countDocuments({ subscriptionStatus: 'premium' }),
            activeListings: await Hotel.countDocuments({ tier: { $ne: 'free' }, active: true }),
            totalLeads: await Lead.countDocuments(),
            interactions: (await User.aggregate([{ $group: { _id: null, total: { $sum: "$interactions" } } }]))[0]?.total || 0
        };
        res.render('layout', { body: await res.app.render('dashboard', { stats }), error: null, success: req.query.success });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Hotels Management
router.get('/hotels', isAdmin, async (req, res) => {
    const hotels = await Hotel.find().sort({ tierRank: -1, name: 1 });
    const content = await new Promise((resolve) => res.app.render('hotels', { hotels }, (err, html) => resolve(html)));
    res.render('layout', { body: content, error: null, success: null });
});

router.get('/hotels/new', isAdmin, async (req, res) => {
    const content = await new Promise((resolve) => res.app.render('hotel_form', { hotel: null }, (err, html) => resolve(html)));
    res.render('layout', { body: content, error: null, success: null });
});

router.post('/hotels/new', isAdmin, async (req, res) => {
    const data = { ...req.body, active: req.body.active === 'on', tierRank: req.body.tier === 'featured' ? 3 : (req.body.tier === 'basic' ? 2 : 1) };
    if (data.tier !== 'free') data.expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await Hotel.create(data);
    res.redirect('/admin/hotels');
});

router.get('/hotels/edit/:id', isAdmin, async (req, res) => {
    const hotel = await Hotel.findById(req.params.id);
    const content = await new Promise((resolve) => res.app.render('hotel_form', { hotel }, (err, html) => resolve(html)));
    res.render('layout', { body: content, error: null, success: null });
});

router.post('/hotels/edit/:id', isAdmin, async (req, res) => {
    const data = { ...req.body, active: req.body.active === 'on', tierRank: req.body.tier === 'featured' ? 3 : (req.body.tier === 'basic' ? 2 : 1) };
    if (data.tier !== 'free' && !data.expiryDate) data.expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await Hotel.findByIdAndUpdate(req.params.id, data);
    res.redirect('/admin/hotels');
});

// Subscription Activation
router.post('/subscriptions/activate', isAdmin, async (req, res) => {
    const { userId } = req.body;
    try {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        await User.findOneAndUpdate(
            { telegramId: userId }, 
            { subscriptionStatus: 'premium', subscriptionExpiry: expiry },
            { returnDocument: 'after' }
        );
        await SubscriptionLog.create({ userId, activatedBy: 'AdminPanel', expiryDate: expiry, amountPaid: process.env.PREMIUM_PRICE });
        res.redirect('/admin/dashboard?success=Subscription activated successfully');
    } catch (err) {
        res.redirect('/admin/dashboard?error=' + err.message);
    }
});

// Leads Log View
router.get('/leads', isAdmin, async (req, res) => {
    try {
        const leads = await Lead.find().sort({ timestamp: -1 });
        const content = await new Promise((resolve) => res.app.render('leads', { leads }, (err, html) => resolve(html)));
        res.render('layout', { body: content, error: null, success: null });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Export Leads to CSV
router.get('/leads/export', isAdmin, async (req, res) => {
    try {
        const leads = await Lead.find().sort({ timestamp: -1 });
        
        // CSV Headers
        let csvContent = 'User Name,User Phone,User Telegram ID,Vendor Category,Vendor Name,Vendor Contact,Clicked Timestamp\n';
        
        // CSV Rows
        for (const lead of leads) {
            const name = `"${(lead.userName || '').replace(/"/g, '""')}"`;
            const phone = `"${(lead.userPhone || '').replace(/"/g, '""')}"`;
            const id = `"${lead.userId}"`;
            const type = `"${(lead.vendorType || '').replace(/"/g, '""')}"`;
            const vendorName = `"${(lead.vendorName || '').replace(/"/g, '""')}"`;
            const contact = `"${(lead.vendorContact || '').replace(/"/g, '""')}"`;
            const date = `"${new Date(lead.timestamp).toLocaleString()}"`;
            
            csvContent += `${name},${phone},${id},${type},${vendorName},${contact},${date}\n`;
        }
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=affiliate_leads_proof.csv');
        res.status(200).send(csvContent);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

module.exports = router;
