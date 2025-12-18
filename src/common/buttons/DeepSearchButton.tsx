import { CollectionItemType } from '@/collection/collection';
import { APPICONS, APPICONS_PER_TYPE } from '@/constants';
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
  IonBreadcrumb,
  IonBreadcrumbs,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonTitle,
  IonToolbar
} from '@ionic/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useEffect, useRef, useState } from 'react';
import { GET_UNKNOWN_ITEM_ROUTE } from '../routes';
import platformService from '../services/platform.service';

const DEEP_SEARCH_RESULTS_HIGHLIGHT_KEY = 'kiwimeri-deep-search-results';
const CONTENT_LABEL_ID_PREFIX = 'global-search-result-content-';
const TITLE_LABEL_ID_PREFIX = 'global-search-result-title-';

type DeepSearchButtonProps = {
  id?: string;
};

type SearchResultProps = {
  searchResult: DeepSearchResult;
  searchOptions: DeepSearchOptions & SearchOptions;
};

function highlightResults(searchResults: DeepSearchResult[]) {
  if (platformService.hasHighlightSupport()) {
    const createRange = (
      node: ChildNode,
      firstMatch: {
        startOffset: number;
        endOffset: number;
      }
    ) => {
      const range = new Range();
      range.setStart(node, firstMatch.startOffset);
      range.setEnd(node, firstMatch.endOffset);
      ranges.push(range);
    };
    const ranges: Range[] = [];
    for (const searchResult of searchResults) {
      if (searchResult.firstTitleMatch) {
        const el = document.getElementById(
          TITLE_LABEL_ID_PREFIX + searchResult.id
        );
        if (el && el.lastChild) {
          createRange(el.lastChild, searchResult.firstTitleMatch);
        }
      }
      if (searchResult.firstContentMatch) {
        const el = document.getElementById(
          CONTENT_LABEL_ID_PREFIX + searchResult.id
        );
        if (el && el.lastChild?.firstChild) {
          createRange(el.lastChild.firstChild, searchResult.firstContentMatch);
        }
      }
    }
    const highlight = new Highlight(...ranges);
    CSS.highlights.set(DEEP_SEARCH_RESULTS_HIGHLIGHT_KEY, highlight);
  }
}

const SearchResult = ({ searchResult }: SearchResultProps) => {
  const textBreadcrumb = searchResult.shortBreadcrumb.split(',').map(id => ({
    title: collectionService.getItemTitle(id)
  }));
  textBreadcrumb.shift(); // remove the notebook
  if (searchResult.type === CollectionItemType.page) {
    textBreadcrumb.pop(); // remove self-entry from breadcrumb
  }
  return (
    <>
      <IonIcon
        slot="start"
        icon={APPICONS_PER_TYPE.get(searchResult.type)}
      ></IonIcon>
      <IonLabel id={CONTENT_LABEL_ID_PREFIX + searchResult.id}>
        <h3>
          <IonBreadcrumbs maxItems={3}>
            <IonBreadcrumb></IonBreadcrumb>
            {textBreadcrumb.map((bd, idx) => {
              // middle
              if (idx < textBreadcrumb.length - 1) {
                return <IonBreadcrumb key={bd.title}>{bd.title}</IonBreadcrumb>;
              }
              // end
              return (
                <IonBreadcrumb key={bd.title}>
                  <IonLabel id={TITLE_LABEL_ID_PREFIX + searchResult.id}>
                    {bd.title}
                  </IonLabel>
                </IonBreadcrumb>
              );
            })}
          </IonBreadcrumbs>
        </h3>
        <p>{searchResult.preview}</p>
      </IonLabel>
      <IonBadge slot="end">{searchResult.nbContentMatches}</IonBadge>
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

  useEffect(() => {
    highlightResults(searchResults);
  }, [searchResults]);

  return (
    <>
      <IonButton id={id} expand="block">
        <IonIcon icon={APPICONS.search}></IonIcon>
      </IonButton>
      <IonModal
        ref={modal}
        trigger={id}
        onIonModalDidPresent={() => highlightResults(searchResults)}
      >
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
          <IonList
            style={{
              maxHeight: 'calc(100% - 64px)',
              overflowY: 'auto',
              padding: '0 8px'
            }}
          >
            {searchResults.map(searchResult => (
              <IonItem
                lines="none"
                key={searchResult.id}
                routerLink={GET_UNKNOWN_ITEM_ROUTE(
                  searchResult.id,
                  searchResult.type
                )}
                onClick={() => {
                  modal.current?.dismiss();
                }}
              >
                <SearchResult
                  searchResult={searchResult}
                  searchOptions={searchOptions}
                />
              </IonItem>
            ))}
          </IonList>
        </IonContent>
      </IonModal>
    </>
  );
};

export default DeepSearchButton;
