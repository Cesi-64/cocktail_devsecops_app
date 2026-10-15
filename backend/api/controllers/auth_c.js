/*** IMPORT */
const jwt = require('jsonwebtoken')

const DB = require('../db.config')

/*** AUTH Controller */
exports.login = async (req, res) => {
    const {email,password} = req.body

    if(!email || !password){
        return res.status(400).json({message: "Bad credentials"})
    }

    try{
        let user = await DB.User.findOne({where: {email: email}, raw: true})
        if(user === null){
            return res.status(401).json({message: "This account does not exist !"})
        }

        let test = await DB.User.checkPassword(password, user.password)
        if(!test){
            return res.status(401).json({message: "Bad credentials"})
        }

        const token = jwt.sign({
            id: user.id,
            pseudo: user.pseudo
        }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_DURING})

        return res.json({access_token: token})
    }catch(e){
        return res.status(500).json({message: 'Database Error'})
    }
} 