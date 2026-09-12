document.documentElement.dataset.dark = getComputedStyle(document.body).backgroundColor === "rgb(0, 0, 0)";

let recent_posts = new Set();
hydrateRecentPosts();

let timelineObserver = null;
let tabObserver = null;

let current_path = window.location.pathname;
let enabled = false;

(async () => {
    const result = await chrome.storage.local.get("enabled");

    enabled = result.enabled ?? false;
})();

initializeTab();


chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.enabled) {
        return;
    }

    enabled = changes.enabled.newValue ?? false;

    handleStateChange();
})

setInterval(async () => {
    if (window.location.pathname === current_path) {
        return;
    }

    current_path = window.location.pathname;

    handleStateChange();
}, 750);

handleStateChange();

async function hydrateRecentPosts() {
    const result = await chrome.storage.local.get("api_key");
    const api_key = result.api_key;

    const response = await fetch(`${hummingbird_config.api_url}/exposures/recent`,
        {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${api_key}`
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to hydrate seen posts: ${response.status}`);
    }

    const json = await response.json();

    for (const exposure of json) {
        recent_posts.add(exposure.post_id);
    }
}

function initializeTimeline() {
    const timeline = getTimeline();

    if (timeline) {
        startTimelineObserver(timeline);
        return;
    }

    const startupObserver = new MutationObserver(() => {
        const timeline = getTimeline();

        if (!timeline) {
            return;
        }

        startupObserver.disconnect();
        startTimelineObserver(timeline);
    });

    startupObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
}

function startTimelineObserver(timeline) {
    timelineObserver?.disconnect();

    timelineObserver = new MutationObserver(async mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                const article = node.firstElementChild?.firstElementChild?.firstElementChild;
                
                if (article?.getAttribute("role") === "article") {
                    processArticle(article);
                } 
            }
        }
    });

    timelineObserver.observe(timeline, {
        childList: true,
        subtree: false
    });

    // handle initial state
    for (const entry of timeline.children) {
        const article = entry.firstElementChild?.firstElementChild?.firstElementChild;
            if (article?.getAttribute("role") === "article") {
                processArticle(article);
            } 
    }
}

function getTimeline() {
    const heading = document.querySelector('[id^="accessible-list-"]');  // accessible-list-x where x is variable
    const timeline = heading?.parentElement?.children[1]?.firstElementChild;

    if (timeline?.style?.position !== "relative") {  // verify a property of the desired object
        return null;
    }

    return timeline;
}

function initializeTab() {
    const startupObserver = new MutationObserver(() => {
        const tab = getTab();

        if (!tab) {
            return;
        }

        setTimeout(() => {              // When loading /home, tablist + tabs are REGENERATED
            if (!tab.isConnected) {     // whenever a new tab is added. Verify
                return;                     // DOM has settled to avoid stale reference
            }

            startupObserver.disconnect();

            startTabObserver(tab);
        }, 750);

    });
    startupObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
    })
}

function startTabObserver(tab) {
    tabObserver?.disconnect();

    tabObserver = new MutationObserver(() => {
        if (tab.getAttribute("aria-selected") === "true") {
            initializeTimeline();
        } else {
            timelineObserver?.disconnect();
            timelineObserver = null;
        }
    });

    tabObserver.observe(tab, {
        childList: false,
        subtree: false,
        attributes: true,
        attributeFilter: ["aria-selected"]
    });

    // Handle initial state
    if (tab.getAttribute("aria-selected") === "true") {
        initializeTimeline();
    }
}

function getTab() {
    //tablist -> for you presentation -> for you tab
    const tab = document.querySelector('[role="tablist"]')?.firstElementChild?.firstElementChild;

    if (tab) {
        return tab;
    }

    return null;
}

async function processArticle(article) {
    if (getAdStatus(article)) {
        return;
    }

    if (article?.dataset?.processed === "true") {
        return;
    }

    article.dataset.processed = "true";

    const post_id = getPostId(article);

    if (recent_posts.has(post_id)) {
        return;
    }
    
    recent_posts.add(post_id);

    const action_bar = article.querySelector('[role="group"][aria-label]');
    handlePost(post_id, getViewCount(action_bar));
}

async function handlePost(post_id, view_count) {

    const response = await fetch(`https://x.com/i/api/graphql/XMOz5h24KAZ86qKffKTLdQ/TweetDetail?variables=%7B%22focalTweetId%22%3A%22${post_id}%22%2C%22with_rux_injections%22%3Afalse%2C%22rankingMode%22%3A%22Relevance%22%2C%22includePromotedContent%22%3Atrue%2C%22withCommunity%22%3Atrue%2C%22withQuickPromoteEligibilityTweetFields%22%3Atrue%2C%22withBirdwatchNotes%22%3Atrue%2C%22withVoice%22%3Atrue%7D`,
        {
            "headers": {
                "accept": "*/*",
                "authorization": "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
                "content-type": "application/json",
                "x-csrf-token": `${getCSRFToken()}`,
            },
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "include"
        }
    );

    const json = await response.json();

    const payload = processJSON(json, view_count);

    if (payload) {
        postPayload(payload);
    }
}

function processJSON(json, view_count) {
    const conversation = json.data?.threaded_conversation_with_injections_v2;

    if (!conversation?.instructions) {
        return null;
    }

    const entries = conversation.instructions[1].entries;
    const result = entries[0].content.itemContent.tweet_results.result;
    const legacy = result.legacy;

    if (!legacy?.id_str) {
        return null;
    }

    const post_id = legacy.id_str;
    const is_quote = legacy.is_quote_status;

    const attachments = [];
    const carousel = legacy.entities?.media;

    if (carousel) {
        for (const media of carousel) {
            const attachment = [];
            if (media.type == "video") {
                const duration = media.video_info.duration_millis;

                attachment.push("video");
                attachment.push(duration);
            } else {
                attachment.push("photo");
                attachment.push(null);
            }

            attachments.push(attachment);
        }
    }

    const replies = [];

    for (const entry of entries) {
        const reply = processReply(entry, post_id);

        if (reply === null) {
            continue;
        }

        replies.push(reply);
    }

        return  {
            post: {
                post_id,
                content: processContent(result),
                created_at: legacy.created_at,
                attachments,
                is_quote: is_quote,
                quote: processQuote(result.quoted_status_result?.result),
                author: processUser(result),
            },
            has_birdwatch_notes: result.has_birdwatch_notes,
            favorite_count: legacy.favorite_count,
            reply_count: legacy.reply_count,
            retweet_count: legacy.retweet_count,
            bookmark_count: legacy.bookmark_count,
            view_count,
            quote_count: legacy.quote_count,
            replies
        };

}

function processContent(result) {
    let content = result.legacy.full_text;

    const media = result.legacy.entities?.media ?? [];

    for (const attachment of media) {
        content = content.replace(attachment.url, "");
    }

    return content.trim();
}

function processUser(result) {
    const legacy = result.legacy;
    const user = result.core?.user_results?.result;

    return {
            user_id: legacy.user_id_str,
            user_name: user.core.screen_name,
            display_name: user.core.name,
            bio: user.profile_bio.description,
            created_at: user.core.created_at,
            follower_count: user.relationship_counts.followers,
            following_count: user.relationship_counts.following,
            tweet_count: user.tweet_counts.tweets,
            media_tweet_count: user.tweet_counts.media_tweets,
            is_blue_verified: user.is_blue_verified,
            is_verified: user.verification.verified
    };

}

function processReply(entry, parent_id) {
    if (!entry.content?.items?.[0]?.item?.itemContent) {
        return null;
    }

    const item = entry.content?.items?.[0]?.item?.itemContent;
    const result = item.tweet_results.result;
    const legacy = result.legacy;


    if (legacy?.in_reply_to_status_id_str !== parent_id) {
        return null;
    }

    const user = result.core.user_results.result;

    return {
        post_id: legacy.id_str,
        content: processContent(result),
        created_at: legacy.created_at, 
        is_quote: legacy.is_quote_status,
        author: processUser(result)
    };
}

function processQuote(result) {
    if (!result) {
        return null;
    }

    const legacy = result.legacy;

    if (!legacy?.id_str) {
        return null;
    }

    const post_id = legacy?.id_str;

    const attachments = [];

    const carousel = legacy?.entities?.media;

    if (carousel) {
        for (const media of carousel) {
            const attachment = [];
            if (media.type == "video") {
                attachment.push("video");
                const duration = media.video_info.duration_millis;
                attachment.push(duration);
            } else {
                attachment.push("photo");
                attachment.push(null);
            }
            attachments.push(attachment);
        }
    }

    return {
        post_id,
        content: processContent(result),
        created_at: legacy.created_at,
        attachments,
        author: processUser(result),
    };

}

function getAdStatus(status) {
    return status.closest('[data-testid="placementTracking"]') !== null;
}

function getPostId(article) {
    const status_link = article.querySelector('a[href*="/status/"]');

    return status_link.getAttribute("href").split("/status/")[1];
}

function getViewCount(action_bar) { // view count is not in json, for some reason
    const label = action_bar.getAttribute("aria-label");

    const match = label.match(/(\d+)\s+(?:view|views)/);

    return match ? Number(match[1]) : -1;
}

async function postPayload(payload) {
    const result = await chrome.storage.local.get("api_key");
    
    const api_key = result.api_key;

    fetch(`${hummingbird_config.api_url}/upload`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${api_key}`
            },
            body: JSON.stringify(payload)
        }
    );
}

function getCSRFToken() {
    const cookie = document.cookie.split("; ").find(row => row.startsWith("ct0="));

    return decodeURIComponent(cookie.substring("ct0=".length));
}

function handleStateChange() {
    if (enabled && (current_path === "/home")) {
        initializeTab();
    } else {
        timelineObserver?.disconnect();
        timelineObserver = null;

        tabObserver?.disconnect();
        tabObserver = null;
    }
}
