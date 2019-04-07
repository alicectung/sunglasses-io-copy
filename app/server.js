var http = require('http');
var fs = require('fs');
var finalHandler = require('finalhandler');
var queryString = require('querystring');
var url = require('url');
var Router = require('router');
var bodyParser   = require('body-parser');
var uid = require('rand-token').uid;
// let failedLoginAttempts = {};
// const TOKEN_VALIDITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

    // Setup router
var myRouter = Router();
myRouter.use(bodyParser.json());
const PORT = 3001;

    // State holding variables
let brands = [];
let users = [];
let products = [];
let accessTokens = [];

    // Create server
const server = http.createServer((request, response) => {

    myRouter(request, response, finalHandler(request, response));

})
.listen(PORT, error => {
    if (error) {
      return console.log("Error on Server Startup: ", error);
    }
    fs.readFile("initial-data/brands.json", "utf8", (error, data) => {
        if (error) throw error;
        brands = JSON.parse(data);
            console.log(`Server setup: ${brands.length} brands loaded`);
    });
    fs.readFile("initial-data/users.json", "utf8", (error, data) => {
        if (error) throw error;
        users = JSON.parse(data);
            console.log(`Server setup: ${users.length} users loaded`);
    });
    fs.readFile("initial-data/products.json", "utf8", (error, data) => {
        if (error) throw error;
        products = JSON.parse(data);
            console.log(`Server setup: ${products.length} products loaded`);
    });
            console.log(`Server is listening on ${PORT}`);
  });

/********************************************************************
********************************************************************/


    // Endpoint to obtain list of brands available
  myRouter.get('/api/brands', function(request, response) {
      
    console.log('BRANDS route: ',request.url)
    let listOfBrands = brands;
        // Accepts request and return the entire array of brand objects
      response.writeHead(200, {'Content-Type': 'application/json'});
      response.end(JSON.stringify(listOfBrands));

  });

    // Endpoint to search for products under a brand
  myRouter.get('/api/brands/:id/products', function(request, response) {

      // Verify that there are products under this brand before we should continue processing
      let filteredProducts = products.filter((product) => {
        return product.categoryId == request.params.id;
      });
      if (filteredProducts.length == 0) {
        // If there isn't a product under that brand, then return a 404
        response.writeHead(404, "Brand not found");
        response.end();
        return;
      } else {
            // Return the products from the store
              response.writeHead(200, {'Content-Type': 'application/json'});
              response.end(JSON.stringify(filteredProducts));
              return;          
      }
    });

    // Endpoint to search for a product with given query
  myRouter.get('/api/products', function(request, response) {
 
    let searchTerm = url.parse(request.url).query
        //console.log('query string = ', searchTerm)

    let queryObject = queryString.parse(searchTerm)
        //console.log('query object: ', queryObject)

    let queryTerm = queryObject.query
        //console.log('queryTerm = ',queryTerm) // Superglasses


    // Check if query is empty OR no matching product
    let matchingProduct = products.filter((product) => {
      // if product has a name value matching search query
        // return that entire product object
            return product.name == queryTerm;    
    });

        // If there isn't a product under that brand, then return a 404
    if (matchingProduct.length == 0) {  
        response.writeHead(404, "Product not found");
        response.end();
        return;
    } else {
         // Else success and return matching product
         response.writeHead(200, {'Content-Type': 'application/json'});
         response.end(JSON.stringify(matchingProduct));
    }
  });

    // Endpoint to process Login call
  myRouter.post('/api/login', function(request,response) {

        //console.log('REQUEST.BODY: ', request.body)

    // Make sure there is a email and password in the request
        if (request.body.email && request.body.password) {
    // See if there is a user that has that email and password
        let user = users.find((user)=>{
        return user.email == request.body.email && user.login.password == request.body.password;
        });

            
    // Write the header because we know we will be returning successful at this point and that the response will be json
        if (user) {   
            response.writeHead(200, {'Content-Type': 'application/json'});
 
        // We have a successful login, if we already have an existing access token, use that
          let currentAccessToken = accessTokens.find((tokenObject) => {
            return tokenObject.email == user.email;
          });
    
        // Update the last updated value so we get another time period
          if (currentAccessToken) {
            //currentAccessToken.lastUpdated = new Date();
            response.end(JSON.stringify(currentAccessToken.token));
          } else {
        // Create a new token with the user value and a "random" token
            let newAccessToken = {
              email: user.email,
              //lastUpdated: new Date(),
              token: uid(16)
            }
                console.log('newAccessToken: ',newAccessToken)

            accessTokens.push(newAccessToken);
            response.end(JSON.stringify(newAccessToken.token));
          }
        } else {
        // When a login fails, tell the client in a generic way that either the email or password was wrong
          response.writeHead(404, "Invalid email or password");
          response.end();
        }
    
    } else {
    // If they are missing one of the parameters, tell the client that something was wrong in the formatting of the response
        response.writeHead(400, "Incorrectly formatted response");
        response.end();
      }
    });

/********************************************************************
********************************************************************/

  // Helper method to process access token
  var getValidTokenFromRequest = function(request) {
    var parsedUrl = require('url').parse(request.url, true);
    if (parsedUrl.query.accessToken) {
      // Verify the access token to make sure it's valid and not expired
      let currentAccessToken = accessTokens.find((accessToken) => {
        return accessToken.token == parsedUrl.query.accessToken && ((new Date) - accessToken.lastUpdated) < TOKEN_VALIDITY_TIMEOUT;
      });
      if (currentAccessToken) {
        return currentAccessToken;
      } else {
        return null;
      }
    } else {
      return null;
    }
  };
/********************************************************************
********************************************************************/

  // Endpoint returns contents of the cart of the user that has authorized with the application
myRouter.get('/api/me/cart', function(request, response) {

// ADJUST THIS CODE PER SUNGLASSES /////////////////////////////////////////

    Console.log('REQUEST.URL: ', request.url)

    let currentAccessToken = getValidTokenFromRequest(request);
    if (!currentAccessToken) {
      // If there isn't an access token in the request, we know that the user isn't logged in, so don't continue
      response.writeHead(401, "You need to have access to this call to continue", CORS_HEADERS);
      response.end();
    } else {
      // Verify that the store exists to know if we should continue processing
      let store = stores.find((store) => {
        return store.id == request.params.storeId;
      });
      if (!store) {
        // If there isn't a store with that id, then return a 404
        response.writeHead(404, "That store cannot be found", CORS_HEADERS);
        response.end();
        return;
      }
    
      // Check if the current user has access to the store
      let user = users.find((user) => {
        return user.login.username == currentAccessToken.username;
      });
      // Only if the user has access to that store do we return the issues from the store
      if (
        user.storeIds.includes(request.params.storeId) &&
        (user.role == 'ADMIN' || user.role == 'MANAGER')
      ) {
        store.issues = request.body;
        response.writeHead(
          200,
          Object.assign(CORS_HEADERS, { 'Content-Type': 'application/json' })
        );
        response.end(JSON.stringify(store));
      } else {
        response.writeHead(403, "You don't have access to that store", CORS_HEADERS);
        response.end();
        return;
      }
    
    }
});


module.exports = server;