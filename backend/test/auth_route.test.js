const request = require('supertest')
const app = require('../api/app')
const DB = require('../api/db.config')

describe('AUTH ROUTER', () => {

    afterAll(async () => {
        await DB.sequelize.close()
    })

    describe('TRY LOGIN WITH BAD DATA', () => {
        it('Should return 400 /=> missing param', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    // email: 'admin@admin.admin',
                    password: 'nimda'
                })
            expect(response.status).toBe(400)
        })

        it('Should return 401 /=> bad email', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: 'admin@truc.admin',
                    password: 'nimda'
                })
            expect(response.status).toBe(401)
        })

        it('Should return 401 /=> bad password', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: 'admin@admin.admin',
                    password: 'truc'
                })
            expect(response.status).toBe(401)
        })
    })

    describe('TRY TO LOG AND GET TOKEN', () => {
        it('Should return 200 with token', async () => {
            const response = await request(app)
                .post('/auth/login')
                .send({
                    email: 'admin@admin.admin',
                    password: 'nimda'
                })
            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty('access_token')
        })
    })
})