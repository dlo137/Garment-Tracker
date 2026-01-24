import React from 'react';
import Svg, { Path } from 'react-native-svg';

export const ClothingTypeIcon = ({ type, color = '#A0A4B8', size = 32 }) => {
  switch (type.toLowerCase()) {
    case 't-shirts':
    case 't-shirt':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path d="M4 7l8-4 8 4 8-4v4l-4 2v19a2 2 0 01-2 2H10a2 2 0 01-2-2V9L4 7V3l8 4" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
        </Svg>
      );
    case 'hoodies':
    case 'hoodie':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path d="M8 12c0-4 4-8 8-8s8 4 8 8v12a4 4 0 01-4 4H12a4 4 0 01-4-4V12z" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
          <Path d="M8 12l8 4 8-4" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
        </Svg>
      );
    case 'pants':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path d="M12 4h8v24h-4v-8h-4v8h-4V4h4z" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
        </Svg>
      );
    case 'shorts':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path d="M4 8h24v8l-4 8h-4v-8h-4v8H8l-4-8V8z" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
        </Svg>
      );
    case 'dresses':
    case 'dress':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path d="M16 4l4 8h-8l4-8zm0 8v16m-8 0h16" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
        </Svg>
      );
    case 'skirts':
    case 'skirt':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path d="M8 8h16l-4 16H12L8 8z" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
        </Svg>
      );
    case 'jackets':
    case 'jacket':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path d="M8 4h16v24H8V4zm0 0l8 8 8-8" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
        </Svg>
      );
    case 'sweaters':
    case 'sweater':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path d="M8 8h16v16a4 4 0 01-4 4H12a4 4 0 01-4-4V8z" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
        </Svg>
      );
    case 'shirts':
    case 'shirt':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path d="M4 8l8-4 8 4 8-4v4l-4 2v19a2 2 0 01-2 2H10a2 2 0 01-2-2V9L4 7V3l8 4" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
        </Svg>
      );
    case 'jeans':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path d="M12 4h8v24h-4v-8h-4v8h-4V4h4z" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
        </Svg>
      );
    case 'coats':
    case 'coat':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path d="M8 4h16v24H8V4zm0 0l8 8 8-8" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
        </Svg>
      );
    case 'suits':
    case 'suit':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path d="M8 4h16v24H8V4zm0 0l8 8 8-8" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
        </Svg>
      );
    case 'blazers':
    case 'blazer':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path d="M8 4h16v24H8V4zm0 0l8 8 8-8" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
        </Svg>
      );
    case 'activewear':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path d="M8 8h16v16a4 4 0 01-4 4H12a4 4 0 01-4-4V8z" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
        </Svg>
      );
    case 'underwear':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path d="M8 20h16v4a4 4 0 01-4 4H12a4 4 0 01-4-4v-4z" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
        </Svg>
      );
    case 'socks':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path d="M12 20v4a4 4 0 004 4h4v-8h-8v4z" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
        </Svg>
      );
    case 'accessories':
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path d="M16 4a4 4 0 110 8 4 4 0 010-8zm0 8v16" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
        </Svg>
      );
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path d="M8 8h16v16H8V8z" stroke={color} strokeWidth={2} strokeLinejoin="round"/>
        </Svg>
      );
  }
};
