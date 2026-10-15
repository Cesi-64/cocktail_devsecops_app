describe('UserAdd Component', () => {
    beforeEach(() => {
        // Connection from public home
        cy.visit('http://localhost:5173')

        cy.getDataCy('admin-link').click()
        cy.getDataCy('admin-login').should("be.visible")

        cy.fixture('user').then(user => {
            cy.login(true, user)
        })

        cy.visit('http://localhost:5173/admin/user/add')

        // API request intercept to check
        cy.intercept('PUT', '**/users', (req) => {
            req.reply({
                statusCode: 201,
                body: {
                    message: 'Utilisateur ajouté (cypress)'
                }
            })
        }).as('addUser')
    })

    it('should add a new user', () => {
        // Fill out the form and submit
        cy.get('input[name="nom"]').type('Test')
        cy.get('input[name="prenom"]').type('User')
        cy.get('input[name="pseudo"]').type('testuser')
        cy.get('input[name="email"]').type('test@example.com')
        cy.get('input[name="password"]').type('password123')

        cy.get('form').submit()

        // Check the call, body and header
        cy.wait('@addUser').then(intercept => {
            expect(intercept.request.body).to.deep.equal({
                nom: 'Test',
                prenom: 'User',
                pseudo: 'testuser',
                email: 'test@example.com',
                password: 'password123',
            })
            expect(intercept.request.headers.authorization).to.contain('Bearer ')
            expect(intercept.response.statusCode).to.eq(201)
        })

        // Check redirection and data in page
        cy.url().should('include', '/admin/user/index')        
    })
})