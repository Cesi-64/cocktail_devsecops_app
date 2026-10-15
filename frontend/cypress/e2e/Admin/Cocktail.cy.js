/// <reference types="cypress" />

describe('ADMIN COCKTAIL INDEX', () => {
    beforeEach(() => {

        // Connection from public home
        cy.visit('http://localhost:5173')

        cy.getDataCy('admin-link').click()
        cy.getDataCy('admin-login').should("be.visible")

        cy.fixture('user').then(user => {
            cy.login(true, user)
        })

        cy.visit('http://localhost:5173/admin/cocktail/index')

        // API requests mocked
        cy.intercept('GET', '**/cocktails', { fixture: 'cocktail-list.json' }).as('getCocktails')
        cy.intercept('DELETE', '**/cocktails/*', { statusCode: 204 }).as('deleteCocktail')
    });

    it('renders user list correctly', () => {
        
        cy.wait('@getCocktails')
        cy.get('table tbody tr').should('have.length', 2)

        // Check cells contain (two first)
        cy.get('table tbody tr:first-child td:nth-child(2)').should('contain', '1')
        cy.get('table tbody tr:first-child td:nth-child(3)').should('contain', 'Mojito')     

        // Check edit link (href contain)
        cy.get('table tbody tr:first-child td:nth-child(2) a').should('have.attr', 'href', '/admin/cocktail/edit/1')
    })

    it('deletes a cocktail', () => {
        cy.wait('@getCocktails');
        cy.get('table tbody tr').should('have.length', 2);

        // Delete first element
        cy.get('.del_ubtn').first().click() 

        // Wait for request end
        cy.wait('@deleteCocktail').then(intercept => {
            console.log(intercept)
            expect(intercept.request.method).to.eq('DELETE')
            expect(intercept.response.statusCode).to.eq(204)
        })

        // Check the rest of element
        cy.get('table tbody tr').should('have.length', 1)
    })

    it('handles errors during user fetch', () => {
        cy.intercept('GET', '**/cocktails', {forceNetworkError: true}).as('getCocktailsWithError')

        cy.visit('http://localhost:5173/admin/cocktail/index')

        cy.wait('@getCocktailsWithError').then(intercept => {
            cy.getDataCy('error-message').should('be.visible')
        })
    })

    // it('handles errors during user deletion', () => {
    //     cy.intercept('DELETE', '**/cocktails/*', {forceNetworkError: true}).as('deleteCocktailWithError')

    //     cy.visit('http://localhost:5173/admin/cocktail/index')
    //     cy.wait('@getCocktails')

    //     cy.get('.del_ubtn').first().click()
    //     cy.wait('@deleteCocktailWithError').then(intercept => {
    //         cy.getDataCy('error-message').should('be.visible')
    //     })
    // })
});