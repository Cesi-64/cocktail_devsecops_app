/*** IMPORT */
const DB = require('../db.config')

/*** Cocktail Controller */
exports.getAllCocktails = (req, res) => {
    DB.Cocktail.findAll()
        .then(cocktails => res.json({ data: cocktails }))
        .catch(err => res.status(500).json({ message: 'Database Error', error:err }))
}

exports.getCocktail = async (req, res) => {
    let cocktailId = parseInt(req.params.id)

    // Vérification si le champ id est présent et cohérent
    if (!cocktailId) {
        /* istanbul ignore next */
        return res.json(400).json({ message: 'Missing Parameter' })
    }

    try {
        // Récupération du cocktail
        let cocktail = await DB.Cocktail.findOne({ where: { id: cocktailId }, include: { model: DB.User, attributes: ['id', 'pseudo', 'email'] } })

        // Test si résultat
        if (cocktail === null) {
            return res.status(404).json({ message: 'This cocktail does not exist !' })
        }

        // Renvoi du Cocktail trouvé
        return res.json({ data: cocktail })
    } catch (err) {
        return res.status(500).json({ message: 'Database Error', error: err })
    }
}

exports.addCocktail = async (req, res) => {
    const { user_id, nom, description, recette } = req.body

    // Validation des données reçues
    if (!user_id || !nom || !description || !recette) {
        return res.status(400).json({ message: 'Missing Data' })
    }

    try {
        // Vérification si le coktail existe
        let cocktail = await DB.Cocktail.findOne({ where: { nom: nom }, raw: true })
        if (cocktail !== null) {
            return res.status(409).json({ message: `The cocktail ${nom} already exists !` })
        }

        // Céation du cocktail
        cocktail = await DB.Cocktail.create(req.body)
        return res.status(201).json({ message: 'Cocktail Created', data: cocktail })
    } catch (err) {
        return res.status(500).json({ message: 'Database Error' })
    }
}

exports.modifyCocktail = async (req, res) => {
    let cocktailId = parseInt(req.params.id)

    // Vérification si le champ id est présent et cohérent
    if (!cocktailId) {
        /* istanbul ignore next */
        return res.status(400).json({ message: 'Missing parameter' })
    }

    try {
        // Recherche du cocktail et vérification
        let cocktail = await DB.Cocktail.findOne({ where: { id: cocktailId }, raw: true })
        if (cocktail === null) {
            return res.status(404).json({ message: 'This cocktail does not exist !' })
        }

        // Check owner
        if (req.auth != cocktail.user_id) {
            return res.status(403).json({ message: "Unauthorized" })
        }

        // Mise à jour du cocktail
        await DB.Cocktail.update(req.body, { where: { id: cocktailId } })
        return res.json({ message: 'Cocktail Updated' })
    } catch (err) {
        return res.status(500).json({ message: 'Database Error' })
    }
}

exports.deleteCocktail = async (req, res) => {
    let cocktailId = parseInt(req.params.id)

    // Vérification si le champ id est présent et cohérent
    if (!cocktailId) {
        /* istanbul ignore next */
        return res.status(400).json({ message: 'Missing parameter' })
    }

    let cocktail = await DB.Cocktail.findOne({ where: { id: cocktailId }, raw: true })

    // Check owner
    if (req.auth != cocktail.user_id) {
        return res.status(403).json({ message: "Unauthorized" })
    }

    // Suppression du cocktail
    DB.Cocktail.destroy({ where: { id: cocktailId }, force: true })
        .then(() => res.status(204).json({}))
        .catch(err => res.status(500).json({ message: 'Database Error' }))
}