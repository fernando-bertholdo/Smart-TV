// Opening a search result takes the search screen off and it's built again on
// the way back, so the query, its results and the card that was opened are kept
// here to come back to. It lives outside the lazily loaded Search view so that
// opening Search from the nav or the remote app, which should start empty, can
// drop it without loading that view.
let kept = null;

export const keepSearchReturn = (state) => {
	kept = state || null;
};

export const peekSearchReturn = () => kept;

export const forgetSearchReturn = () => {
	kept = null;
};
