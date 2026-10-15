/*** IMPORT */
const jwt = require('jsonwebtoken')

/*** EXTRACT TOKEN */
const extractBearer = authorization => {
    if(typeof authorization !== 'string'){
        return false
    }

    const matches = authorization.match(/(bearer)\s+(\S+)/i)

    return matches && matches[2]
}


/*** CHECK TOKEN */
const checkToken = (req, res, next) => {
    const token = req.headers.authorization && extractBearer(req.headers.authorization)

    if(!token){
        return res.status(401).json({message: "Gros malin va"})
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
        if(err){
            return res.status(401).json({message: "Gros malin va 2 le retour"})
        }

        req.auth = decodedToken.id

        next()
    })
}

module.exports = checkToken