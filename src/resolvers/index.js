const path = require("path");
const fsPromises = require("fs/promises");
const {
  fileExists,
  deleteFile,
  getDirectoryFileNames,
} = require("../utils/fileHandling");
const { GraphQLError, printType } = require("graphql");
const crypto = require("crypto");

const cartDirectory = path.join(__dirname, "..", "data", "carts"); //filvägen till mina carts-filer
const productDirectory = path.join(__dirname, "..", "data", "products"); //filvägen till mina products-filer

exports.resolvers = {
  Query: {
    getAllCarts: async (_, args) => {
      const carts = await getDirectoryFileNames(cartDirectory);

      const cartData = [];

      for (const file of carts) {
        const filePath = path.join(cartDirectory, file);

        const fileContents = await fsPromises.readFile(filePath, {
          encoding: "utf-8",
        });
        const data = JSON.parse(fileContents);

        cartData.push(data);
      }
      return cartData;
    },
    getCartById: async (_, args) => {
      const cartId = args.cartId;

      const cartFilePath = path.join(cartDirectory, `${cartId}.json`);

      const cartExists = await fileExists(cartFilePath);

      if (!cartExists)
        return new GraphQLError("The cart you are looking for does not exist");
      const cartData = await fsPromises.readFile(cartFilePath, {
        encoding: "utf-8",
      });

      const data = JSON.parse(cartData);

      return data;
    },
  },
  Mutation: {
    createNewCart: async (_, args) => {
      const newCart = {
        id: crypto.randomUUID(),
        totalamount: 0,
        products: [],
      };

      let filePath = path.join(cartDirectory, `${newCart.id}.json`);

      let idExists = true;
      while (idExists) {
        const exists = await fileExists(filePath);
        console.log(exists, newCart.id);
        //är detta ifall id redan finns så slumpas ett nytt id?
        // if (exists) {
        //   newCart.id = crypto.randomUUID();
        //   filePath = path.join(cartDirectory, `${newCart.id}.json`);
        // }

        idExists = exists;
      }
      //varför stringify här?
      await fsPromises.writeFile(filePath, JSON.stringify(newCart));

      return newCart;
    },
    createNewProduct: async (_, args) => {
      const { productName, price } = args.input;
      const id = crypto.randomUUID();

      const newProduct = {
        productId: id,
        productName: productName,
        price: price,
      };

      let filePath = path.join(productDirectory, `${newProduct.id}.json`);

      let idExists = true;
      while (idExists) {
        const exists = await fileExists(filePath);

        if (exists) {
          newProduct.productId = crypto.randomUUID();
          filePath = path.join(
            productDirectory,
            `${newProduct.productId}.json`
          );
        }

        idExists = exists;
      }

      await fsPromises.writeFile(filePath, JSON.stringify(newProduct));

      return newProduct;
    },
    addProductToCart: async (_, args) => {
      const { cartId, productId } = args; //hämta cartid och product id. Så att man kan skriva in vilka man väljer i apollo.

      const filePath = path.join(cartDirectory, `${cartId}.json`); //hitta carten med det id som skrivits in i args
      const cartExist = await fileExists(filePath); //om filen finns läggs den i cartExist.

      if (!cartExist) {
        return new GraphQLError("This cart does not exist!"); //om carten med det it inte hittas. returnera felmeddelande
      }

      const productFilepath = path.join(productDirectory, `${productId}.json`); // hitta productsfilen med id som skrevs in i args.
      const productExist = await fileExists(productFilepath); //om filen finns lagras den i variabeln productexist.

      if (!productExist) {
        return new GraphQLError("This product doesn't exist!"); //om det inte finns en fil med det id. Skicka felmeddelande
      }

      const cartFile = await fsPromises.readFile(filePath, {
        //läser cartfilen inkl alla products den innehåller. filepath är pathen och encoding gör att vi kan läsa den tydligare
        //products-responsen
        encoding: "utf-8",
      });
      //console.log(cartFile);

      let shoppingCart = JSON.parse(cartFile); // gör om våran cartfile till json-objekt och lägger till i shoppingcartvariabeln. shoppingCart är alltså våran cart som innehåller alla products.
      //console.log("kolla här:", shoppingCart);

      const newProduct = await fsPromises.readFile(productFilepath, {
        //läser productfilen som väljs ut genom productid.
        encoding: "utf-8",
      });
      //console.log(newProduct); nya produkten som med hjälp av producId läggs till i befintlig cart.
      const productToCart = JSON.parse(newProduct); // gör om nya produkten som skapats från json-data till javascriptobjekt. nu innehåller alltså variabeln productToCart den nya produkten i javascriptformat eftersom att vi ska pusha in den i våran cart.
      //vi gör om till javascriptobjekt eftersom att det inte går att arbeta med JSON i javascript.

      const products = shoppingCart.products; //alla produkter som finns i en specifik shoppingcart. Visar endast produkterna. loggar man shoppingcart ser man hela varukorgen med dess id och totalAmount, samt alla prductsobjekt inuti.

      shoppingCart.products.push(productToCart); //pushar nya produkten vi valt genom productId och pushar in den i shoppingcart.products.Detta för vi vill att den ska läggas i products inuti carts och inte direkt i carts.

      let totalamount = 0; //deklarerar totalsumman
      for (let i = 0; i < shoppingCart.products.length; i++) {
        //loopar igenom alla products som finns i varukorgen och skriver ut varje pris.
        totalamount += shoppingCart.products[i].price; //totalamount plussas på med priset för varje varv den körs i loopen
      }

      const updatedCart = { cartId, products, totalamount }; // hämtar nya cartId, products och totalamount och

      await fsPromises.writeFile(filePath, JSON.stringify(updatedCart)); //skriver över gamla filen efersom den har samma cartId. gör även om från javascript till JSON-data. Den uppdaterar alltså gamla varukorgen

      return updatedCart; //returnerar den uppdaterade varukorgen så vi kan göra om allt!
    },
  },
};
