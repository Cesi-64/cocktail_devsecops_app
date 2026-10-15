/*** IMPORT */
const app = require('./api/app')
const db = require('./api/db.config')
const start = require('./api/config/first_start')


/*** START SERVER */
db.sequelize.authenticate()
    .then(() => console.log("Database connection OK"))
    .then(async () => {
        await start.initFirstUser()
        app.listen(process.env.SERVER_PORT, () => {
            console.log(`This server is running on port ${process.env.SERVER_PORT}`)
        })
    })
    .catch(e => console.log(e))

