/*** IMPORT */
const request = require('supertest')
const DB = require('../api/db.config')
const app = require('../api/app')

let notCID
let cID
let token

describe('COCKTAIL ROUTE', () => {

    beforeAll( async () => {
        const response = await request(app)
            .post('/auth/login')
            .send({
                email: 'admin@admin.admin',
                password: 'nimda'
            })
        token = response.body.access_token
    })

    afterAll( async () => {
        await DB.sequelize.close()
    })

    describe('TRY PUT', () => {
        it('Should return 400 /=> missing data', async () => {
            const response = await request(app)
                .put('/cocktails')
                .set('authorization', 'Bearer '+token)
                .send({
                    user_id: 1,
                    //nom: 'La Déchirade',
                    description: 'Il te déchire au premier verre',
                    recette: 'tu veux même pas savoir, tu ne dois pas savoir !'
                })
            expect(response.status).toBe(400)
        })

        it('Should return 201 /=> new Cocktail', async () => {
            const response = await request(app)
                .put('/cocktails')
                .set('authorization', 'Bearer '+token)
                .send({
                    user_id: 1,
                    nom: 'La Déchirade',
                    description: 'Il te déchire au premier verre',
                    recette: 'tu veux même pas savoir, tu ne dois pas savoir !'
                })
            expect(response.status).toBe(201)
            cID = response.body.data.id
        })

        it('Should return 409 /=> new same Cocktail', async () => {
            const response = await request(app)
                .put('/cocktails')
                .set('authorization', 'Bearer '+token)
                .send({
                    user_id: 1,
                    nom: 'La Déchirade',
                    description: 'Il te déchire au premier verre',
                    recette: 'tu veux même pas savoir, tu ne dois pas savoir !'
                })
            expect(response.status).toBe(409)
        })
    })

    describe('TRY GET', () => {
        it('Sould return 200 /=> Get All Cocktail', async () => {
            const response = await request(app).get(`/cocktails`)
            expect(response.status).toBe(200)
        })
        it('Should return 200 /=> Get one Cocktail', async () => {
            const response = await request(app).get(`/cocktails/${cID}`)
            expect(response.status).toBe(200)
        })
        it('Should return 501 /=> Get Cocktail with bad id', async () => {
            const response = await request(app).get(`/cocktails/marcel`)
            expect(response.status).toBe(501)
        })
        it('Should return 404 /=> Get bad Cocktail', async () => {
            const response = await request(app).get(`/cocktails/11111111111111111111`)
            expect(response.status).toBe(404)
        })
    })

    describe('TRY PATCH', () => {
        it("Sould return 404 /=> Modify bad Cocktail", async () => {
            const response = await request(app)
                .patch('/cocktails/111111111111111111111')
                .set('authorization', 'Bearer '+token)
                .send({
                    nom: 'roger'
                })
            expect(response.status).toBe(404)
        })
        it("Sould return 200 /=> Modify Cocktail", async () => {
            const response = await request(app)
                .patch(`/cocktails/${cID}`)
                .set('authorization', 'Bearer '+token)
                .send({
                    nom: 'roger'
                })
            expect(response.status).toBe(200)
        })
    })

    describe('TRY DELETE', () => {
        it('Sould return 204', async () => {
            const response = await request(app)
                .delete(`/cocktails/${cID}`)
                .set('authorization', 'Bearer '+token)
            expect(response.status).toBe(204)
        })
    })
})