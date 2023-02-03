const path = require("path");
const fsPromises = require("fs/promises");
const {
  fileExists,
  deleteFile,
  getDirectoryFileNames,
} = require("../utils/fileHandling");
const { GraphQLError } = require("graphql");
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

      await fsPromises.writeFile(filePath, JSON.stringify(newCart));

      return newCart;
    },
    createNewProduct: async (_, args) => {
      const { productName, price } = args.input;

      const newProduct = {
        productId: crypto.randomUUID(),
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
      const cartExist = await fileExists(filePath);

      if (!cartExist) {
        return new GraphQLError("This cart does not exist!");
      }

      const productFilepath = path.join(productDirectory, `${productId}.json`);
      const productExist = await fileExists(productFilepath);

      if (!productExist) {
        return new GraphQLError("This product doesn't exist!");
      }

      const cartFile = await fsPromises.readFile(filePath, {
        encoding: "utf-8",
      });

      let shoppingCart = JSON.parse(cartFile);

      const newProduct = await fsPromises.readFile(productFilepath, {
        encoding: "utf-8",
      });

      const productToCart = JSON.parse(newProduct);
      // console.log(productToCart);

      const products = shoppingCart.products;
      console.log(products);

      shoppingCart.products.push(productToCart);

      let totalamount = 0;
      for (let i = 0; i < shoppingCart.products.length; i++) {
        totalamount += shoppingCart.products[i].price;
      }
      let id = cartId;
      const updatedCart = { id, products, totalamount };

      await fsPromises.writeFile(filePath, JSON.stringify(updatedCart));

      return updatedCart;
    },
    deleteCart: async (_, args) => {
      const cartId = args.cartId;

      const filePath = path.join(cartDirectory, `${cartId}.json`);

      const cartExists = await fileExists(filePath);
      if (!cartExists) return new GraphQLError("That cart does not exist");

      try {
        await deleteFile(filePath);
      } catch (error) {
        return {
          deletedId: cartId,
          success: false,
        };
      }
      return {
        deletedId: cartId,
        success: true,
      };
    },

    // deleteProduct: async (_, args) => {
    //   const { cartId, productId } = args;
    //   const filePath = path.join(cartDirectory, `${cartId}.json`);
    //   const cartExists = await fileExists(filePath);
    //   const productFilePath = path.join(productDirectory, `${productId}.json`);
    //   const productExists = await fileExists(productFilePath);
    //   if (!cartExists) {
    //     return new GraphQLError("Shoppingcart does not exist");
    //   }
    //   if (!productExists) {
    //     return new GraphQLError("Product does not exist");
    //   }
    //   try {
    //     const cartData = await fsPromises.readFile(filePath, {
    //       encoding: "utf-8",
    //     });
    //     let shoppingCart = JSON.parse(cartData);
    //     const cartProducts = shoppingCart.products;
    //     let totalPrice = shoppingCart.totalamount;
    //     const product = await fsPromises.readFile(productFilePath, {
    //       encoding: "utf-8",
    //     });
    //     const productToRemove = JSON.parse(product);

    //     for (let i = 0; i < cartProducts.length; i++) {
    //       if (cartProducts[i].id === productId) {
    //         cartProducts.splice(i, 1);
    //       }
    //     }
    //     totalPrice = 0;
    //     for (let i = 0; i < cartProducts.length; i++) {
    //       totalPrice += cartProducts[i].productPrice;
    //     }
    //     let id = cartId; // förstår inte varför, men funkar inte om jag skriver cartId i updatedCart
    //     const updatedCart = { id, cartProducts, totalPrice };
    //     await fsPromises.writeFile(filePath, JSON.stringify(updatedCart));
    //     return updatedCart;
    //   } catch (error) {
    //     return new GraphQLError("Could not delete");
    //   }
    // },
    deleteProductFromCart: async (_, args) => {
      const { cartId, productId } = args;

      const filePath = path.join(cartDirectory, `${cartId}.json`);
      const cartExist = await fileExists(filePath);
      const productFilepath = path.join(productDirectory, `${productId}.json`);
      const productExist = await fileExists(productFilepath);

      if (!cartExist) {
        return new GraphQLError("This cart does not exist!");
      }
      if (!productExist) {
        return new GraphQLError("This product doesn't exist!");
      }

      const cartFile = await fsPromises.readFile(filePath, {
        encoding: "utf-8",
      });
      const product = await fsPromises.readFile(productFilepath, {
        encoding: "utf-8",
      });

      let shoppingCart = JSON.parse(cartFile);
      //console.log(shoppingCart);
      let products = shoppingCart.products;
      //console.log(shoppingCart.products);
      let totalamount = shoppingCart.totalamount;

      //console.log(cartProducts);

      for (let i = 0; i < shoppingCart.products.length; i++) {
        if (productId === shoppingCart.products[i].productId) {
          //console.log("hej");
          shoppingCart.products.splice(i, 1);
        }
      }
      totalPrice = 0;
      for (let i = 0; i < products.length; i++) {
        totalPrice += products[i].productPrice;
      }
      let id = cartId;
      const updatedCart = { id, products, totalamount };
      console.log(products);

      await fsPromises.writeFile(filePath, JSON.stringify(updatedCart));

      return updatedCart;
    },
  },
};
