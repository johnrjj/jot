import React, { Component } from 'react';
import styled from 'styled-components';
import { X } from 'react-feather';
import { colors } from '../theme';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile, faPen, faComment } from '@fortawesome/free-solid-svg-icons';

const FileIcon = props => <FontAwesomeIcon icon={faFile} {...props} />;
const PenIcon = props => <FontAwesomeIcon icon={faPen} {...props} />;
const CommentIcon = props => <FontAwesomeIcon icon={faComment} {...props} />;

export const HistoryContainer = styled.div`
  flex-basis: 360px;
  border-left: 1px solid #f5f5f5;
  flex-direction: column;
  width: 100%;
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
  padding: 1px 0;
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
  width: 44px;
  height: 44px;
  position: relative;
`;

export const AvatarImg = styled.img`
  height: 100%;
  width: 100%;
  border-radius: 100%;
`;

export const CreatedFileIcon = styled(FileIcon)`
  color: ${colors.yellow.normal};
`;

export const EditedFileIcon = styled(PenIcon)`
  color: ${colors.purple.normal};
`;

export const CommentedFileIcon = styled(CommentIcon)`
  color: ${colors.green.normal};
`;

export const AvatarStatus = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  bottom: -22%;
  right: -22%;
  width: 50%;
  height: 50%;
  background-color: ${colors.yellow.light};
  z-index: 1;
  border-radius: 100%;
  border: 2px solid ${colors.white.normal};
`;
// 'https://randomuser.me/api/portraits/men/3.jpg'

export interface HistoryItemProps {
  avatarSrc: string;
  name: string;
  date: string;
  type: 'edited' | 'created' | 'commented';
}

export const HistoryItem = ({ avatarSrc, name, date, type }: HistoryItemProps) => {
  const IconToUse = type === 'edited' ? EditedFileIcon : type === 'commented' ? CommentedFileIcon : CreatedFileIcon;

  const avatarStatusBackgroundColor =
    type === 'edited' ? colors.purple.light : type === 'commented' ? colors.green.light : colors.yellow.light;

  return (
    <HistoryDetail>
      <AvatarContainer>
        <AvatarImg src={avatarSrc} />
        <AvatarStatus style={{ backgroundColor: avatarStatusBackgroundColor }}>
          <IconToUse />
        </AvatarStatus>
      </AvatarContainer>
      <HistoryDetailContent>
        <HistoryDetailContentText>
          {name + ' '}
          <HistoryDetailContentSeconaryText>
            {type === 'edited'
              ? 'edited the document'
              : type === 'commented'
              ? 'commented on the document'
              : 'created the document '}
          </HistoryDetailContentSeconaryText>
          <HistoryDetailContentMetaText>• {date}</HistoryDetailContentMetaText>
        </HistoryDetailContentText>
      </HistoryDetailContent>
    </HistoryDetail>
  );
};
