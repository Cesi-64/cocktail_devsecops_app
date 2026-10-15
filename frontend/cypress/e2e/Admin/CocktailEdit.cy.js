/// <reference types="cypress" />

describe('ADMIN COCKTAIL EDIT', () => {
    beforeEach(() => {

        // Connection from public home
        cy.visit('http://localhost:5173')

        cy.getDataCy('admin-link').click()
        cy.getDataCy('admin-login').should("be.visible")

        cy.fixture('user').then(user => {
            cy.login(true, user)
        })

        cy.visit('http://localhost:5173/admin/cocktail/index')

    })

    it('Should fill form with data', () => {
        cy.intercept('PATCH', '**/cocktails/*', (req) => {
            req.reply({
                statusCode: 200,
                body: {
                    message: 'Cocktail updated'
                },
            })
        }).as('modifyCocktail');

        cy.fixture('one_cocktail').then(ckt => {
            cy.intercept('GET', '**/cocktails/*', { fixture: 'one_cocktail.json' }).as('getOneCocktail')

            cy.visit('http://localhost:5173/admin/cocktail/edit/' + ckt.data.id)

            cy.wait('@getOneCocktail').then(() => {
                cy.get('input[name="nom"]').should('have.value', ckt.data.nom)
                cy.get('input[name="description"]').should('have.value', ckt.data.description)
                cy.get('input[name="recette"]').should('have.value', ckt.data.recette)
            })

            cy.get('input[name="nom"]').clear().type('modifCKT')

            cy.get('form').submit()

            cy.wait('@modifyCocktail').then(intercept => {
                expect(intercept.request.body).to.have.property('nom', 'modifCKT');
                expect(intercept.request.headers.authorization).to.contain('Bearer ')
                expect(intercept.response.statusCode).to.eq(200)
            })

            // Check redirection and data in page
            cy.url().should('include', '/admin/cocktail/index')
        })
    })
})