/*** IMPORT */
const { DataTypes } = require('sequelize')

/*** Cocktail Model */
module.exports = (sequelize) => {
    const Cocktail = sequelize.define('Cocktail', {
        id: {
            type: DataTypes.INTEGER(10),
            primaryKey: true,
            autoIncrement: true
        },
        user_id:{
            type: DataTypes.INTEGER(10),
            allowNull: false
        },
        nom:{
            type: DataTypes.STRING(100),
            defaultValue: '',
            allowNull: false
        },
        description:{
            type: DataTypes.TEXT,
            defaultValue: '',
            allowNull: false,
        },
        recette:{
            type: DataTypes.TEXT,
            defaultValue: '',
            allowNull: false,
        }
    })          

    return Cocktail
}