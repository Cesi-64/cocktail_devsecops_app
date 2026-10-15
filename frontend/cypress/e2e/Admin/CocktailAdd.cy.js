describe('UserAdd Component', () => {
    beforeEach(() => {
        // Connection from public home
        cy.visit('http://localhost:5173')

        cy.getDataCy('admin-link').click()
        cy.getDataCy('admin-login').should("be.visible")

        cy.fixture('user').then(user => {
            cy.login(true, user)
        })

        cy.visit('http://localhost:5173/admin/cocktail/add')

        // API request intercept to check
        // cy.intercept('PUT', '**/cocktails').as('addCocktail')
        cy.intercept('PUT', '**/cocktails', (req) => {
            req.reply({
                statusCode: 201,
                body:{
                    message: 'Cocktail Ajouté (cypress)'
                }
            })
        }).as('addCocktail')
    })

    it('should add a new cocktail', () => {
        // Fill out the form and submit
        cy.get('input[name="nom"]').type('Test')
        cy.get('input[name="description"]').type('Cocktail')
        cy.get('input[name="recette"]').type('Une recette de ce cocktail')

        cy.get('form').submit()
  
        // Check the call, body and header
        cy.wait('@addCocktail').then(intercept => {
            console.log(intercept)
            expect(intercept.request.body).to.deep.include({
                nom: 'Test',
                description: 'Cocktail',
                recette: 'Une recette de ce cocktail',
            }).and.have.property('user_id')
            expect(intercept.request.headers.authorization).to.contain('Bearer ')
            expect(intercept.response.statusCode).to.eq(201)
        })

        // Check redirection and data in page
        cy.url().should('include', '/admin/cocktail/index') 
        cy.contains('Cocktail').should('be.visible')
    })  
})