import { CollectionItemType } from '@/collection/collection';
import { APPICONS } from '@/constants';
import collectionService from '@/db/collection.service';
import {
  contentSearchService,
  DeepSearchOptions,
  DeepSearchResult,
  SearchOptions
} from '@/search/collection-content-search.service';
import {
  InputCustomEvent,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonModal,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useRef, useState } from 'react';
import {
  GET_DOCUMENT_ROUTE,
  GET_FOLDER_ROUTE,
  GET_PAGE_ROUTE
} from '../routes';

type DeepSearchButtonProps = {
  id?: string;
};

type SearchResultProps = {
  searchResult: DeepSearchResult;
  searchOptions: DeepSearchOptions & SearchOptions;
};

// TODO icon for type
// TODO refacto to reuse route code between here and LocalChangesCard
// TODO breadcrumb
// TODO CSS.highlight in preview
// TODO text color, handle title
const SearchResult = ({ searchResult }: SearchResultProps) => {
  console.debug(searchResult);
  // maybe i should store the text breadcrumb
  return (
    <>
      {/* <CollectionItemBreadcrumb folder={searchResult.id} /> */}
      {searchResult.preview}
      <IonBadge slot="end">+{searchResult.nbMatches}</IonBadge>
    </>
  );
};

const DeepSearchButton = ({
  id = 'global-search-btn'
}: DeepSearchButtonProps) => {
  const { t } = useLingui();
  const modal = useRef<HTMLIonModalElement>(null);
  const [searchResults, setSearchResults] = useState<DeepSearchResult[]>([]);
  const [searchText, setSearchText] = useState<string>('');

  const searchOptions = {
    searchInTitle: true
  };
  return (
    <>
      <IonButton id={id} expand="block">
        <IonIcon icon={APPICONS.search}></IonIcon>
      </IonButton>
      <IonModal ref={modal} trigger={id}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>
              <Trans>Search Content</Trans>
            </IonTitle>

            <IonButtons slot="end">
              <IonButton onClick={() => modal.current?.dismiss()}>
                <IonIcon icon={APPICONS.closeAction} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          {/* input panel */}
          <IonList>
            <IonItem lines="none">
              <IonInput
                aria-label={t`Search input`}
                placeholder={t`Enter your search`}
                value={searchText}
                onIonChange={(e: InputCustomEvent) => {
                  if (typeof e.detail.value === 'string') {
                    setSearchText(e.detail.value || '');
                    setSearchResults(
                      contentSearchService.deepSearch(
                        e.detail.value || '',
                        searchOptions
                      )
                    );
                  }
                }}
              >
                <IonIcon
                  slot="start"
                  icon={APPICONS.search}
                  aria-hidden="true"
                ></IonIcon>
                <IonButton
                  fill="clear"
                  slot="end"
                  aria-label="Show/hide"
                  onClick={() => {
                    setSearchText('');
                    setSearchResults([]);
                  }}
                >
                  <IonIcon
                    slot="icon-only"
                    icon={APPICONS.resetAction}
                    aria-hidden="true"
                  ></IonIcon>
                </IonButton>
              </IonInput>
            </IonItem>
          </IonList>

          {/* result panel */}
          <IonList>
            {searchResults.map(searchResult => {
              let route, parent, doc;
              switch (searchResult.type) {
                case CollectionItemType.folder:
                case CollectionItemType.notebook:
                  route = GET_FOLDER_ROUTE(searchResult.id);
                  break;
                case CollectionItemType.page:
                  doc = collectionService.getItemParent(searchResult.id);
                  parent = collectionService.getItemParent(doc);
                  route = GET_PAGE_ROUTE(parent, doc, searchResult.id);
                  break;
                case CollectionItemType.document:
                  // eslint-disable-next-line no-case-declarations
                  parent = collectionService.getItemParent(searchResult.id);
                  route = GET_DOCUMENT_ROUTE(parent, searchResult.id);
                  break;
              }
              return (
                <IonItem
                  key={searchResult.id}
                  routerLink={route}
                  onClick={() => {
                    modal.current?.dismiss();
                  }}
                >
                  <SearchResult
                    searchResult={searchResult}
                    searchOptions={searchOptions}
                  />
                </IonItem>
              );
            })}
          </IonList>
        </IonContent>
      </IonModal>
    </>
  );
};

export default DeepSearchButton;
