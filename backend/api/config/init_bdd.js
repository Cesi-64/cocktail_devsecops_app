/*** IMPORT */
const DB = require('../db.config')

const populateBdd = async () => {
    await DB.sequelize.sync({alter: true})
    await DB.sequelize.close()
}

populateBdd()

