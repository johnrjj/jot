import React, { Component } from 'react';
import styled from 'styled-components';
import { X } from 'react-feather';
import { colors } from '../theme';

export const HistoryContainer = styled.div`
  flex-basis: 360px;
  border-left: 1px solid #f5f5f5;
  flex-direction: column;
  widht: 100%;
`;

export const HistoryHeaderContainer = styled.div`
  height: 6rem;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const HistoryHeaderText = styled.span`
  padding-left: 24px;
  padding-right: 24px;
  font-size: 1.25rem;
`;

export const HistoryCloseButton = styled(X)`
  padding-right: 24px;
`;

export const HistoryDetail = styled.div`
  display: flex;
  padding-left: 24px;
  padding-right: 24px;
  margin-bottom: 2rem;
`;

export const HistoryDetailContent = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  margin-left: 20px;
  padding: 4px 0;
`;

export const HistoryDetailContentText = styled.span`
  font-size: 18px;
  line-height: 1.25;
  font-weight: 500;
  letter-spacing: 0.25px;
  color: ${colors.gray.darker};
`;

export const HistoryDetailContentSeconaryText = styled.span``;

export const HistoryDetailContentMetaText = styled.span`
  font-size: 17px;
  line-height: 1.25;
  color: ${colors.gray.dark};
`;

export const AvatarContainer = styled.div`
  width: 56px;
  height: 56px;
  position: relative;
`;

export const AvatarImg = styled.img`
  height: 100%;
  width: 100%;
  border-radius: 100%;
`;

export const AvatarStatus = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20%;
  height: 20%;
  background-color: ${colors.green.normal};
  z-index: 1;
  border-radius: 100%;
  border: 1px solid ${colors.white.normal};
`;
