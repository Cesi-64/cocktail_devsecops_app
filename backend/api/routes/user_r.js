/*** IMPORT */
const express = require('express')
const userCtrl = require('../controllers/user_c')

/*** EXPRESS ROUTER */
let router = express.Router()

/*** TIME MIDDLEWARE */
/* istanbul ignore next */
// router.use( (req, res, next) => {
//     const event = new Date()
//     console.log('User Time :', event.toString())
//     next()
// })

/*** USER ROUTER */

router.get('/', userCtrl.getAllUsers)
router.get('/:id([0-9]+)', userCtrl.getUser)

router.put('/', userCtrl.addUser)
router.patch('/:id([0-9]+)', userCtrl.modifyUser)

router.delete('/:id([0-9]+)', userCtrl.deleteUser)

module.exports = router