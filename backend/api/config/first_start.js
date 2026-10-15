/*** IMPORT */
const DB = require('../db.config')

/*** CREATE FIRST ADMIN USER */
exports.initFirstUser = async () => {
    try{
        const test = await DB.User.findAll()
        if(test.length == 0){
            console.log('First user admin created')
            console.log('email : admin@admin.admin\npassword: '+process.env.FIRST_ADMIN_PASSWORD)
            console.log('### PLEASE CHANGE PASSWORD')
            await DB.User.create({
                pseudo: 'admin',
                email: 'admin@admin.admin',
                password: process.env.FIRST_ADMIN_PASSWORD
            })
        }        
    }catch(err){
        console.log(err)
    }
}