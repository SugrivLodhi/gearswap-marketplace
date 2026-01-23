import { gql } from '@apollo/client';

// Auth Mutations
export const REGISTER = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        id
        email
        role
      }
    }
  }
`;

export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        email
        role
      }
    }
  }
`;

// Product Queries
export const GET_PRODUCTS = gql`
  query GetProducts($filters: ProductFilters, $pagination: PaginationInput) {
    products(filters: $filters, pagination: $pagination) {
      edges {
        node {
          id
          name
          description
          category
          imageUrl
          variants {
            id
            sku
            price
            stock
            attributes {
              key
              value
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_PRODUCT = gql`
  query GetProduct($id: ID!) {
    product(id: $id) {
      id
      name
      description
      category
      imageUrl
      seller {
        id
        email
      }
      variants {
        id
        sku
        price
        stock
        attributes {
          key
          value
        }
      }
    }
  }
`;

// Cart Queries & Mutations
export const GET_MY_CART = gql`
  query GetMyCart {
    myCart {
      items {
        productId
        variantId
        productName
        variantSku
        price
        quantity
        subtotal
      }
      subtotal
      discount
      total
    }
  }
`;

export const ADD_TO_CART = gql`
  mutation AddToCart($input: AddToCartInput!) {
    addToCart(input: $input) {
      items {
        productId
        variantId
        productName
        variantSku
        price
        quantity
        subtotal
      }
      subtotal
      discount
      total
    }
  }
`;

export const UPDATE_CART_ITEM = gql`
  mutation UpdateCartItem($input: UpdateCartItemInput!) {
    updateCartItem(input: $input) {
      items {
        productId
        variantId
        productName
        variantSku
        price
        quantity
        subtotal
      }
      subtotal
      discount
      total
    }
  }
`;

export const REMOVE_FROM_CART = gql`
  mutation RemoveFromCart($productId: ID!, $variantId: ID!) {
    removeFromCart(productId: $productId, variantId: $variantId) {
      items {
        productId
        variantId
        productName
        variantSku
        price
        quantity
        subtotal
      }
      subtotal
      discount
      total
    }
  }
`;

export const APPLY_DISCOUNT = gql`
  mutation ApplyDiscount($code: String!) {
    applyDiscount(code: $code) {
      items {
        productId
        variantId
        productName
        variantSku
        price
        quantity
        subtotal
      }
      subtotal
      discount
      total
    }
  }
`;

// Order Mutations & Queries
export const CHECKOUT = gql`
  mutation Checkout {
    checkout {
      id
      status
      items {
        productName
        variantSku
        price
        quantity
        subtotal
      }
      subtotal
      discount
      total
      createdAt
    }
  }
`;

export const GET_MY_ORDERS = gql`
  query GetMyOrders {
    myOrders {
      id
      status
      items {
        productName
        variantSku
        price
        quantity
        subtotal
      }
      subtotal
      discount
      total
      discountCode
      createdAt
    }
  }
`;

// Seller Queries & Mutations
export const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      name
      description
      category
      imageUrl
      variants {
        id
        sku
        price
        stock
        attributes {
          key
          value
        }
      }
    }
  }
`;

export const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
      name
      description
      category
      imageUrl
      variants {
        id
        sku
        price
        stock
        attributes {
          key
          value
        }
      }
    }
  }
`;

export const GET_SELLER_ORDERS = gql`
  query GetSellerOrders {
    sellerOrders {
      id
      status
      items {
        productName
        sellerId
        variantSku
        price
        quantity
        subtotal
      }
      subtotal
      total
      createdAt
    }
  }
`;

export const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($orderId: ID!, $status: OrderStatus!) {
    updateOrderStatus(orderId: $orderId, status: $status) {
      id
      status
    }
  }
`;

export const CREATE_DISCOUNT = gql`
  mutation CreateDiscount($input: CreateDiscountInput!) {
    createDiscount(input: $input) {
      id
      code
      type
      value
      expiryDate
      minimumCartValue
      maxUses
      currentUses
      isActive
    }
  }
`;

export const GET_MY_DISCOUNTS = gql`
  query GetMyDiscounts {
    myDiscounts {
      id
      code
      type
      value
      expiryDate
      minimumCartValue
      maxUses
      currentUses
      isActive
      createdAt
    }
  }
`;
