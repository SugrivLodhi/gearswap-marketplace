// Placeholder for product schema - will copy from existing backend
export const productTypeDefs = `
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@external"])

  type Product @key(fields: "id") {
    id: ID!
    name: String!
    description: String!
    category: String!
    imageUrl: String!
    seller: User!
    hsnCode: String!
    gstRate: Float!
    sgstRate: Float!
    cgstRate: Float!
    igstRate: Float!
    variants: [Variant!]!
    createdAt: String!
    updatedAt: String!
  }

  type Variant {
    id: ID!
    sku: String!
    price: Float!
    stock: Int!
    attributes: [AttributePair!]!
  }

  type AttributePair {
    key: String!
    value: String!
  }

  type ProductEdge {
    node: Product!
    cursor: String!
  }

  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String
  }

  type ProductConnection {
    edges: [ProductEdge!]!
    pageInfo: PageInfo!
  }

  input ProductFilters {
    search: String
    category: String
    minPrice: Float
    maxPrice: Float
    sellerId: ID
  }

  input PaginationInput {
    limit: Int
    cursor: String
  }

  input VariantInput {
    sku: String!
    price: Float!
    stock: Int!
    attributes: [AttributeInput!]!
  }

  input AttributeInput {
    key: String!
    value: String!
  }

  input CreateProductInput {
    name: String!
    description: String!
    category: String!
    imageUrl: String!
    hsnCode: String!
    gstRate: Float
    sgstRate: Float
    cgstRate: Float
    igstRate: Float
    variants: [VariantInput!]!
  }

  input UpdateProductInput {
    name: String
    description: String
    category: String
    imageUrl: String
    hsnCode: String
    gstRate: Float
    sgstRate: Float
    cgstRate: Float
    igstRate: Float
    variants: [VariantInput!]
  }

  extend type User @key(fields: "id") {
    id: ID! @external
  }

  type Query {
    product(id: ID!): Product!
    products(filters: ProductFilters, pagination: PaginationInput): ProductConnection!
  }

  type Mutation {
    createProduct(input: CreateProductInput!): Product!
    updateProduct(id: ID!, input: UpdateProductInput!): Product!
    deleteProduct(id: ID!): Boolean!
  }
`;
