const path = require("path");
const fsPromises = require("fs/promises");
const {
  fileExists,
  deleteFile,
  getDirectoryFileNames,
} = require("../utils/fileHandling");
const { GraphQLError, printType } = require("graphql");
const crypto = require("crypto");

const cartDirectory = path.join(__dirname, "..", "data", "carts");
const productDirectory = path.join(__dirname, "..", "data", "products");

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
      const { cartId, productId } = args;

      const filePath = path.join(cartDirectory, `${cartId}.json`);
      const shoppingCartExists = await fileExists(filePath);

      if (!shoppingCartExists) {
        return new GraphQLError("This cart does not exist!");
      }

      const productFilepath = path.join(productDirectory, `${productId}.json`);
      const productExists = await fileExists(productFilepath);

      if (!productExists) {
        return new GraphQLError("This product doesn't exist!");
      }

      const cartContents = await fsPromises.readFile(filePath, {
        encoding: "utf-8",
      });
      console.log(cartContents);

      let shoppingCart = JSON.parse(cartContents);

      const fileContents = await fsPromises.readFile(productFilepath, {
        encoding: "utf-8",
      });

      const productToCart = JSON.parse(fileContents);

      const products = shoppingCart.products;
      shoppingCart.products.push(productToCart);

      let totalamount = 0;
      for (let i = 0; i < shoppingCart.products.length; i++) {
        totalamount += shoppingCart.products[i].price;
      }

      const updatedCart = { cartId, products, totalamount };

      await fsPromises.writeFile(filePath, JSON.stringify(updatedCart));

      // console.log(shoppingcart.products);

      return updatedCart;
    },
  },
};
