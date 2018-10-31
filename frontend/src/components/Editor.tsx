import React, { Component } from 'react';
import styled from 'styled-components';
import { ChevronLeft, Clock, MoreHorizontal } from 'react-feather';
import { colors, theme } from '../theme';

export const EditorContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  max-width: 64rem;
  flex-basis: 64rem;
  margin-right: 4rem;
  margin-left: 4rem;
`;

export const EditorToolbar = styled.div`
  height: 6rem;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f5f5f5;
  margin-bottom: 2rem;
`;

export const EditorToolbarLeftGroup = styled.div`
  display: flex;
  align-items: center;
`;

export const EditorToolbarBackIcon = styled(ChevronLeft)`
  color: ${colors.black.light};
  margin-right: 0.5rem;
  opacity: 0.87;
`;
export const EditorToolbarBackText = styled.span`
  color: ${colors.black.light};
`;

export const EditorToolbarRightGroup = styled.div`
  display: flex;
  align-items: center;
`;

export const EditorToolbarButtonContainer = styled.div`
  cursor: pointer;
  padding: 0.5rem 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid ${colors.gray.light};
  border-radius: 8px;
  color: ${colors.gray.darker};
  margin: 0 0.25rem;
`;

export const EditorToolbarHistoryButtonIcon = styled(Clock)`
  color: ${colors.gray.darker};
  height: 16px;
  width: 16px;
  padding-right: 8px;
`;

export const EditorToolbarMoreButtonIcon = styled(MoreHorizontal)`
  color: ${colors.gray.darker};
  height: 16px;
  width: 16px;
  padding-left: 8px;
`;

export const FakeTitle = styled.div`
  font-family: 'Playfair Display', serif;
  font-size: 3rem;
  color: ${theme.editor.primaryTextColor};
  font-weight: 700;
  line-height: 1.5;
  margin-bottom: 2rem;
  letter-spacing: 1px;
`;

export const SlateEditorContainer = styled.div`
  overflow-y: scroll;
  line-height: 2;
  color: ${theme.editor.primaryTextColor};
  font-size: 20px;
  letter-spacing: 0.25;
`;
