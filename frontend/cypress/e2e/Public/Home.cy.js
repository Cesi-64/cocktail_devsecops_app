/// <reference types="cypress" />

describe('HOME PAGE TEST', () => {
    // const mockCocktails = {
    //     data: [
    //         { id: 1, nom: 'Mojito' },
    //         { id: 2, nom: 'Cosmopolitan' },
    //         { id: 3, nom: 'Margarita' },
    //     ]
    // };

    it('Try display and request', () => {
        // cy.intercept('GET', '**/cocktails', { body: mockCocktails }).as('getAllCocktails')
        cy.intercept('GET', '**/cocktails', { fixture: 'cocktails.json' }).as('getAllCocktails')

        cy.visit('http://localhost:5173')

        cy.getDataCy('home-page').should('exist')

        cy.getDataCy('home-page p').should('exist')

        cy.wait('@getAllCocktails').then(data => {
            // cy.get('[data-cy="home-page"] .card_link').should('have.length', 3)
            cy.getDataCy('home-page .card_link').should('have.length', 3)
        })
    })

    it('Should handles API Error', () => {
        cy.intercept('GET', '**/cocktails', {forceNetworkError: true}).as('failed')

        cy.visit('http://localhost:5173')

        cy.wait('@failed').then(intercept => {
            cy.getDataCy('error-message').should('be.visible')
            cy.get('[data-cy="home-page"] .card_link').should('have.length', 0)
        })
 
    })

})