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
      const carts = await getDirectoryFileNames(cartDirectory); //alla filer i carts

      const cartData = [];

      for (const file of carts) {
        //för varje fil i cartsmappen
        const filePath = path.join(cartDirectory, file); //gå in i filen

        const fileContents = await fsPromises.readFile(filePath, {
          //hämta och läs filen
          encoding: "utf-8",
        });
        const data = JSON.parse(fileContents); //gör om från JSON till javascript

        cartData.push(data); //pusha objekten i tomma listan så de kan presenteras.
      }
      return cartData; //returnera listan.
    },
    getCartById: async (_, args) => {
      const cartId = args.cartId; //lagra id som skrivits in i inputen i cartID-variabeln

      const cartFilePath = path.join(cartDirectory, `${cartId}.json`); //hitta sökvägen

      const cartExists = await fileExists(cartFilePath); //filen hittas

      if (!cartExists)
        //om det inte blir någon response och filen inte finns skickas felmeddelande
        return new GraphQLError("The cart you are looking for does not exist");
      const cartData = await fsPromises.readFile(cartFilePath, {
        //om den finns så läses filens innehåll här och lagras i cartData-variabeln
        encoding: "utf-8",
      });

      const data = JSON.parse(cartData); //gör om från JSON till javascript lägg i variabeln data

      return data; //returnera data
    },
  },
  Mutation: {
    createNewCart: async (_, args) => {
      const newCart = {
        //skapar ny cart där id blir slumpat, totalamount är 0 och product-listan är tom.
        id: crypto.randomUUID(),
        totalamount: 0,
        products: [],
      };

      let filePath = path.join(cartDirectory, `${newCart.id}.json`); //skapar filvägen med nya ID

      await fsPromises.writeFile(filePath, JSON.stringify(newCart)); //skapar filen. gör om newCart-objektet från javascript till JSON-data

      return newCart;
    },
    createNewProduct: async (_, args) => {
      const { productName, price } = args.input; //hämtar namn ochh pris från inputen
      const id = crypto.randomUUID(); //genererar ett random id

      const newProduct = {
        //skapar ett nytt objekt med inputsen-.
        productId: id,
        productName: productName,
        price: price,
      };

      let filePath = path.join(productDirectory, `${newProduct.id}.json`); //skapar filvägen

      let idExists = true;
      while (idExists) {
        const exists = await fileExists(filePath); //om filen redan finns. Alltså fil med samma id, lagra i variabeln exists

        if (exists) {
          //om exists = true
          newProduct.productId = crypto.randomUUID(); //ge id ett nytt slumpat id
          filePath = path.join(
            //skapa ny filväf med nya id
            productDirectory,
            `${newProduct.productId}.json`
          );
        }

        idExists = exists;
      }

      await fsPromises.writeFile(filePath, JSON.stringify(newProduct)); //skapa/skriv över ny fil. Gör först om newProduct från js till JSON

      return newProduct;
    },
    addProductToCart: async (_, args) => {
      const { cartId, productId } = args; //hämta cartid och product id. Dessa är alltså de man skriver in i apollo under variables

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
        encoding: "utf-8",
      });
      //console.log(cartFile);

      let shoppingCart = JSON.parse(cartFile); // gör om våran cartfile från JSON till javascript-objekt och lägger till i shoppingcartvariabeln. shoppingCart är alltså våran cart som innehåller alla products.
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
    deleteProduct: async (_, args) => {
      // get project id
      const productId = args.productId; //hämta product id (id jag skriver in i args)

      const filePath = path.join(productDirectory, `${productId}.json`); // hittar productfilen med det productid.

      const productExists = await fileExists(filePath); //finns det en fil med det ID? annars felmeddelande
      if (!productExists)
        return new GraphQLError("That product does not exist");

      try {
        //om TRUE deletefile
        await deleteFile(filePath); //tar bort den filen.
      } catch (error) {
        //om error returnera id som jag använder försöker radera samt att success: fail
        return {
          deletedId: productId,
          success: false,
        };
      }

      return {
        deletedId: productId, //om det lyckades returnera productID som togs bort samt success:true
        success: true,
      };
    },
    deleteCart: async (_, args) => {
      const cartId = args.cartId; //hämta cartID

      const filePath = path.join(cartDirectory, `${cartId}.json`); //sök om det finns en fil med detta cartId

      const cartExists = await fileExists(filePath); //finns det en fil med det ID? annars felmeddelande
      if (!cartExists) return new GraphQLError("That cart does not exist");

      try {
        //om TRUE deletefile
        await deleteFile(filePath); //tar bort den filen.
      } catch (error) {
        //om error returnera id som jag använder försöker radera samt att success: fail
        return {
          deletedId: cartId,
          success: false,
        };
      }
      return {
        deletedId: cartId, //om det lyckades returnera cartID som togs bort samt success:true
        success: true,
      };
    },
  },
};
