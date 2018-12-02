import React, { Component } from 'react';
import styled from 'styled-components';
import { theme, colors } from '../theme';
import { Search, Plus, Folder, File } from 'react-feather';

export const SideBarContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 5;
  max-width: 24rem;
  padding-top: ${theme.sidebar.leftPadding};
  background-color: ${theme.sidebar.backgroundColor};
`;

export const SidebarIdentitySection = styled.div`
  margin-left: ${theme.sidebar.leftPadding};
  margin-bottom: ${theme.sidebar.paddingBetweenSections};
  display: flex;
  flex-direction: row;
`;

export const SidebarIdentityLogo = styled.div`
  height: 56px;
  width: 56px;
  border-radius: 8px;
  background-image: linear-gradient(
    56deg,
    #8cdcfb 0%,
    #6bbafd 25%,
    #53a0fe 35%,
    #93a1f0 49%,
    #8e8eef 61%,
    #5d5cee 100%
  );
`;

export const SidebarIdentityUserInfoContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1;
  /* background-color: ${colors.lightBlue.normal}; */
`;

export const SidebarSearchContainer = styled.div`
  margin-left: ${theme.sidebar.leftPadding};
  margin-bottom: ${theme.sidebar.paddingBetweenSections};
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const SidebarSearchIcon = styled(Search)`
  height: 24px;
  width: 24px;
  color: ${colors.gray.dark};
  margin-right: ${theme.sidebar.spaceBetweenIconAndText};
`;
export const SidebarSearchText = styled.span`
  color: ${colors.gray.dark};
`;

export const SidebarAddFileLinkContainer = styled.div`
  margin-left: ${theme.sidebar.leftPadding};
  margin-bottom: ${theme.sidebar.paddingBetweenSections};
  display: flex;
  flex-grow: 0;
  flex-direction: row;
  align-items: center;
`;

//https://www.flaticon.com/free-icon/notepad_148972#term=write&page=1&position=23
// i really liek these icons

export const SidebarAddFileLinkIcon = styled(Plus)`
  color: ${theme.sidebar.actionLinkColor};
  margin-right: ${theme.sidebar.spaceBetweenIconAndText};
`;
export const SidebarAddFileLinkText = styled.span`
  color: ${theme.sidebar.actionLinkColor};
  line-height: 24px;
`;

export const SidebarFolderLinkContainer = styled.div`
  margin-left: ${theme.sidebar.leftPadding};
  margin-bottom: 16px;
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const SidebarFolderLinkIcon = styled(Folder)`
  color: ${theme.sidebar.actionLinkColor};
  margin-right: ${theme.sidebar.spaceBetweenIconAndText};
`;
export const SidebarFolderLinkText = styled.span`
  color: ${theme.sidebar.folderLinkColor};
  font-weight: 600;
  line-height: 24px;
`;

export const SidebarFileLinkContainer = styled.div`
  padding-left: calc(${theme.sidebar.leftPadding} + 2rem);
  padding-top: 8px;
  padding-bottom: 8px;
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: ${props => (props.selected ? colors.lightBlue.normal : 'inherit')};
`;

export const SidebarFileLinkIcon = styled(File)`
  color: ${props => (props.selected ? '#fff' : theme.sidebar.fileColor)};

  margin-right: ${theme.sidebar.spaceBetweenIconAndText};
`;
export const SidebarFileLinkText = styled.span`
  color: ${props => (props.selected ? '#fff' : theme.sidebar.folderLinkColor)};
  font-weight: ${props => (props.selected ? '600' : '500')};
  line-height: 24px;
`;

export const SidebarContentContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow-y: auto;
`;

export const Sidebar = () => (
  <SideBarContainer>
    <SidebarIdentitySection>
      <SidebarIdentityLogo />
      <SidebarIdentityUserInfoContainer />
    </SidebarIdentitySection>
    <SidebarSearchContainer>
      <SidebarSearchIcon />
      <SidebarSearchText>Search Files or Folders</SidebarSearchText>
    </SidebarSearchContainer>
    <SidebarAddFileLinkContainer>
      <SidebarAddFileLinkIcon />
      <SidebarAddFileLinkText>Add File or Folder</SidebarAddFileLinkText>
    </SidebarAddFileLinkContainer>
    <SidebarFolderLinkContainer>
      <SidebarFolderLinkIcon />
      <SidebarFolderLinkText>Sample Document Folder</SidebarFolderLinkText>
    </SidebarFolderLinkContainer>
    <SidebarFileLinkContainer>
      <SidebarFileLinkIcon />
      <SidebarFileLinkText>Quick notes</SidebarFileLinkText>
    </SidebarFileLinkContainer>
    <SidebarFileLinkContainer selected>
      <SidebarFileLinkIcon selected />
      <SidebarFileLinkText selected>Welcome to the Jot Editor</SidebarFileLinkText>
    </SidebarFileLinkContainer>
    <SidebarFileLinkContainer style={{ marginBottom: '16px' }}>
      <SidebarFileLinkIcon />
      <SidebarFileLinkText>Interesting facts about snakes</SidebarFileLinkText>
    </SidebarFileLinkContainer>
    <SidebarFolderLinkContainer>
      <SidebarFolderLinkIcon />
      <SidebarFolderLinkText>Favorite recipes</SidebarFolderLinkText>
    </SidebarFolderLinkContainer>
    <SidebarFolderLinkContainer>
      <SidebarFolderLinkIcon />
      <SidebarFolderLinkText>Book reviews</SidebarFolderLinkText>
    </SidebarFolderLinkContainer>
    <SidebarContentContainer />
  </SideBarContainer>
);
