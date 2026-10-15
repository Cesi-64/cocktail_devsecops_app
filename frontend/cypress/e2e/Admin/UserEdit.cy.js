/// <reference types="cypress" />

describe('ADMIN USER EDIT', () => {
    beforeEach(() => {

        // Connection from public home
        cy.visit('http://localhost:5173')

        cy.getDataCy('admin-link').click()
        cy.getDataCy('admin-login').should("be.visible")

        cy.fixture('user').then(user => {
            cy.login(true, user)
        })

        cy.visit('http://localhost:5173/admin/user/index')

    })

    it('Should fill form with data', () => {
        cy.intercept('PATCH', '**/users/*', (req) => {
            req.reply({
                statusCode: 200,
                body: {
                    message: 'User updated'
                },
            })
        }).as('modifyUser');

        cy.fixture('user-one').then(user => {
            cy.intercept('GET', '**/users/*', { fixture: 'user-one.json' }).as('getOneUser')

            cy.visit('http://localhost:5173/admin/user/edit/' + user.data.id)

            cy.wait('@getOneUser').then(() => {
                cy.get('input[name="nom"]').should('have.value', user.data.nom)
                cy.get('input[name="prenom"]').should('have.value', user.data.prenom)
                cy.get('input[name="pseudo"]').should('have.value', user.data.pseudo)
                cy.get('input[name="email"]').should('have.value', user.data.email)
            })

            cy.get('input[name="email"]').clear().type('modif@modif.modif')

            cy.get('form').submit()

            cy.wait('@modifyUser').then(intercept => {
                expect(intercept.request.body).to.have.property('email', 'modif@modif.modif');
                expect(intercept.request.headers.authorization).to.contain('Bearer ')
                expect(intercept.response.statusCode).to.eq(200)
            })

            // Check redirection and data in page
            cy.url().should('include', '/admin/user/index')
        })
    })
})