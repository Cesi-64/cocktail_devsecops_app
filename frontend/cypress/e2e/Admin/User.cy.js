/// <reference types="cypress" />

describe('ADMIN USER INDEX', () => {
    beforeEach(() => {

        // Connection from public home
        cy.visit('http://localhost:5173')

        cy.getDataCy('admin-link').click()
        cy.getDataCy('admin-login').should("be.visible")

        cy.fixture('user').then(user => {
            cy.login(true, user)
        })

        cy.visit('http://localhost:5173/admin/user/index')

        // API requests mocked
        cy.intercept('GET', '**/users', { fixture: 'user-list.json' }).as('getUsers')
        cy.intercept('DELETE', '**/users/*', (req) => {
            req.reply({
                statusCode: 204,
                body:{
                    message: 'Utilisateur supprimé (cypress)'
                }
            })
        }).as('deleteUser')
    });

    it('renders user list correctly', () => {
        
        cy.wait('@getUsers')
        cy.get('table tbody tr').should('have.length', 2)

        // Check cells contain (two first)
        cy.get('table tbody tr:first-child td:nth-child(2)').should('contain', '1')
        cy.get('table tbody tr:first-child td:nth-child(3)').should('contain', 'user1')     

        // Check edit link (href contain)
        cy.get('table tbody tr:first-child td:nth-child(2) a').should('have.attr', 'href', '/admin/user/edit/1')
    })

    it('deletes a user', () => {
        cy.wait('@getUsers');
        cy.get('table tbody tr').should('have.length', 2);

        // Delete second element (save the first real user)
        cy.get('.del_ubtn').eq(1).click()

        // Wait for request end
        cy.wait('@deleteUser').then(intercept => {
            console.log(intercept)
            expect(intercept.request.method).to.eq('DELETE')
            expect(intercept.response.statusCode).to.eq(204)
        })        

        // Check the rest of element
        cy.get('table tbody tr').should('have.length', 1)
    })

    it('handles errors during user fetch', () => {
        cy.intercept('GET', '**/users', {forceNetworkError: true}).as('getUsersWithError')

        cy.visit('http://localhost:5173/admin/user/index')

        cy.wait('@getUsersWithError').then(intercept => {
            cy.getDataCy('error-message').should('be.visible')
        })
    })

    it('handles errors during user deletion', () => {
        cy.intercept('DELETE', '**/users/*', {forceNetworkError: true}).as('deleteUserWithError')

        cy.visit('http://localhost:5173/admin/user/index')
        cy.wait('@getUsers')

        cy.get('.del_ubtn').eq(1).click()
        cy.wait('@deleteUserWithError').then(intercept => {
            cy.getDataCy('error-message').should('be.visible')
        })
    })
});