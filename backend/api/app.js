/*** IMPORT */
const express = require('express')
const cors = require('cors')
const checkToken = require('./middleware/checkJwt')

/*** INIT API */
const app = express()
app.disable("x-powered-by")

app.use(cors({
    origin: process.env.ALLOW_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: "Origin, X-Requested-With, x-access-token, role, Content, Accept, Content-Type, Authorization"
 }))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

/*** IMPORT ROUTERS */
const auth_router = require('./routes/auth_r')
const user_router = require('./routes/user_r')
const cocktail_router = require('./routes/cocktail_r')

/*** MIDDLEWARE TO LOG REQUEST */
app.use( (req, res, next) => {
    res.once('finish', () => {
        const event = new Date()
        console.log(`[${req.method}] [${req.originalUrl}] [${res.statusCode}] -- `, event.toLocaleString())
    })
    
    next()
})

/*** MAIN ROUTER */
app.get('/', (req, res) => res.send(`I'm online. All is OK !....`))

app.use('/auth', auth_router)
app.use('/users', checkToken, user_router)
app.use('/cocktails', cocktail_router)

app.all('*', (req, res) => res.status(501).send("What the hell are you doing !"))


module.exports = app