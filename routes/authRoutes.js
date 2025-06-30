const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers/authController');

// Mostrar formulario de login
router.get('/login', (req, res) => {
  res.render('login', { error: null, successMessage: null, showHomeOnly: true });
});

// Procesar login (POST)
router.post('/login', login);

// Mostrar formulario de registro
router.get('/register', (req, res) => {
  res.render('register', { error: null, successMessage: null, oldData: {}, showHomeOnly: true });
});

// Procesar registro (POST)
router.post('/register', register);


router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;