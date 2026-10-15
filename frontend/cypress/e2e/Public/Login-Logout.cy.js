/// <reference types="cypress" />

describe("LOGIN LOGOUT", () => {
    beforeEach(() => {
        cy.visit('http://localhost:5173')
        // cy.visit(Cypress.env('frontUrl'))
    })

    it('Should display error with good Credentials', () => {
        cy.getDataCy('admin-link').click()
        cy.getDataCy('admin-login').should("be.visible")

        cy.fixture('user').then(user => {
            cy.login(true, user)
        })

        cy.getDataCy('admin-header').should('be.visible')
        cy.getDataCy('admin-logout').click()
        cy.getDataCy('home-page').should('be.visible')

    })

    it('Shoud display and Error message on bad credentials', () => {
        cy.getDataCy('admin-link').click()
        cy.getDataCy('admin-login').should("be.visible")

        cy.fixture('user').then(user => {
            cy.login(false, user)
        })

        cy.getDataCy('error-message').should('be.visible')      

    })

    // it("Should login and redirect to admin page and return home", () => {

    //     cy.get('[data-cy="admin-link"]').click()
    //     cy.get('[data-cy="admin-login"]').should("be.visible")

    //     cy.get('[data-cy="admin-login"').click()

    //     cy.get('[data-cy="admin-header"]').should('be.visible')

    //     cy.get('[data-cy="admin-logout"]').click()
    //     cy.get('[data-cy="home-page"]').should('be.visible')

    // })


})