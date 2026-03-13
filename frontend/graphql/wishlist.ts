import { gql } from '@apollo/client';

export const GET_WISHLIST = gql`
  query GetWishlist {
    wishlist {
      id
      name
      description
      category
      imageUrl
      isWishlisted
      variants {
        id
        price
        stock
      }
    }
  }
`;

export const TOGGLE_WISHLIST = gql`
  mutation ToggleWishlist($productId: ID!) {
    toggleWishlist(productId: $productId) {
      id
      isWishlisted
    }
  }
`;
