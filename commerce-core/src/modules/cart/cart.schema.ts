import gql from 'graphql-tag';

export const cartTypeDefs = gql`
  type CartItem {
    id: ID!
    productId: ID!
    productName: String!
    variantId: ID!
    variantSku: String!
    price: Float!
    quantity: Int!
    subtotal: Float!
    product: Product!
  }

  type Cart {
    id: ID!
    items: [CartItem!]!
    subtotal: Float!
    discount: Float!
    total: Float!
    discountCode: String
  }

  input AddToCartInput {
    productId: ID!
    variantId: ID!
    quantity: Int!
  }

  input UpdateCartItemInput {
    productId: ID!
    variantId: ID!
    quantity: Int!
  }

  extend type Product @key(fields: "id") {
    id: ID! @external
  }

  extend type Query {
    myCart: Cart!
  }

  extend type Mutation {
    addToCart(input: AddToCartInput!): Cart!
    updateCartItem(input: UpdateCartItemInput!): Cart!
    removeFromCart(productId: ID!, variantId: ID!): Cart!
    clearCart: Boolean!
    applyDiscount(code: String!): Cart!
  }
`;
