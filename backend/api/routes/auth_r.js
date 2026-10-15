/*** IMPORT */
const express = require('express')
const authCtrl = require('../controllers/auth_c')

/*** EEXPRESS ROUTER */
let router = express.Router()

/*** AUTH ROUTAGE */
router.post('/login', authCtrl.login)

module.exports = router