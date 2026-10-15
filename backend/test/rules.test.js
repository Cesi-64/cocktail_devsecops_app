/*** IMPORT */
const request = require('supertest')
const DB = require('../api/db.config')
const app = require('../api/app')

let tokenAdmin
let cocktailId

let userID
let userToken

describe('OWNER RULES', () => {

    beforeAll(async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'admin@admin.admin',
                password: 'nimda'
            })
        tokenAdmin = response.body.access_token
    })

    afterAll(async () => {
        await DB.sequelize.close()
    })

    describe('CREATE USER AND COCKTAIL AND MODIFY', () => {

        it('Should return 201 /=> new User', async () => {
            const response = await request(app)
                .put('/users')
                .set('authorization', 'Bearer ' + tokenAdmin)
                .send({
                    pseudo: 'marcel',
                    email: 'marcel@roger.com',
                    password: 'roger'
                })
            expect(response.status).toBe(201)
            userID = response.body.data.id
        })

        it('Should return 201 /=> new Cocktail', async () => {
            const response = await request(app)
                .put('/cocktails')
                .set('authorization', 'Bearer ' + tokenAdmin)
                .send({
                    user_id: 1,
                    nom: 'OWNER TEST',
                    description: 'Il te déchire au premier verre',
                    recette: 'tu veux même pas savoir, tu ne dois pas savoir !'
                })
            expect(response.status).toBe(201)
            cID = response.body.data.id
        })
    })

    describe('LOG MODIFY COCKTAIL WITH BAD USER', () => {
        it('Should return 200 with token', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: 'marcel@roger.com',
                    password: 'roger'
                })
            expect(response.status).toBe(200)
            userToken = response.body.access_token
        })

        it("Sould return 403 /=> Modify Cocktail owner", async () => {
            const response = await request(app)
                .patch('/cocktails/' + cID)
                .set('authorization', 'Bearer ' + userToken)
                .send({
                    nom: 'roger'
                })
            expect(response.status).toBe(403)
        })
    })

    describe('CLEAR TEST USER AND COCKTAIL', () => {
        it('Sould return 403 /=> bad owner to delete', async () => {
            const response = await request(app)
                .delete(`/cocktails/${cID}`)
                .set('authorization', 'Bearer ' + userToken)
            expect(response.status).toBe(403)
        })
        it('Sould return 204', async () => {
            const response = await request(app)
                .delete(`/users/${userID}`)
                .set('authorization', 'Bearer ' + tokenAdmin)
            expect(response.status).toBe(204)
        })
        it('Sould return 204', async () => {
            const response = await request(app)
                .delete(`/cocktails/${cID}`)
                .set('authorization', 'Bearer ' + tokenAdmin)
            expect(response.status).toBe(204)
        })
    })
})