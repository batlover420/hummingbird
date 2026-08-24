## **1.1: HUMMINGBIRD**

*Hummingbird* is a private, user-driven analysis of the subjective quality and sentiment of content shown to users on the social media platform ***X***, formerly known as ***Twitter***, with the intent to identify trends in low-quality posts. It accomplishes this via the *Hummingbird browser extension,* which processes telemetry data obtained from automated *X API* requests and ships this data to an external server named *Treehouse.*

See **5.1: DATA COLLECTION** for more information.

The subjective quality of a post is determined by a number of factors, including the post’s overall sentiment as well as a number of user-driven data points known as *flags*.

See **2.4: FLAGS** for more information.

Currently, Hummingbird only has the capability to process text content, and does not retain any attachment source information. This means that any low-quality content contained exclusively inside of an attachment will not be processed. However, posts of this variety are sparse enough on browser sessions of X that for the purpose of this project they may be ignored.

---

## **2.1: USAGE**

Each non-promoted post on the **For You** timeline now contains 3 additional buttons on the post’s *action bar*. When clicked, these buttons will *flag* a post internally as *AI Generated, Controversial,* or *Engagement Bait.* These flags will be used to help determine the subjective quality of a post.

See **2.4: FLAGS** for more information.

Hummingbird keeps track of all posts a participant has been exposed to within a rolling 48-hour period. Subsequent exposures to these posts will not be processed; however the user may still update the post’s flags. This acts as a measure to prevent rate-limiting by skipping unnecessary API requests.

### **2.2: REGISTRATION**

Hummingbird must first be registered before it will begin processing data. Opening the extension’s information popup will prompt the user for an invite code, which will be provided directly to participants alongside versions of the extension with a valid Treehouse API url. Once the invite code has been accepted, this prompt will disappear and be replaced with a button that may be used to toggle the extension.

If this button reads “ENABLED”, the extension is enabled. 

### **2.3: QUOTE TWEETS**

Posts that fall into the category of “*quote tweets*” are to be flagged with respect to the quoted post. If either the original post or the quoted post fall into one of the categories below, the original post is to be flagged accordingly.

### **2.4: FLAGS**

Flags are meant to distinguish low-quality posts into distinct categories that are unlikely to be caught by a classifier based purely on the text content. The AI-Generated flag is an exception to this rule; however it may be used to assess the accuracy of the classifier, whose precise model and implementation have not yet been determined.

The flags are described as follows:

+ **AI Generated:** This flag is to be attributed to posts that are suspected to originate from AI-run accounts and/or contain AI-Generated **TEXT CONTENT**.

+ **Controversial:** This flag is to be attributed to posts encouraging controversial discussion, especially surrounding topics users might be passionate about. This includes posts encouraging low-brow political discussion, posts discussing controversial public figures, posts encouraging violence or hate speech, and posts disparaging individuals or classes of individuals of a shared attribute.

+ **Engagement Bait:** This flag is to be attributed to posts created with the intention of generating interactions from other users. Posts of this variety are often also *Controversial*. This includes posts encouraging low-brow political discussion, posts expressingly comically disagreeable viewpoints, and posts in which the author intentionally acts oblivious to something to generate replies.

A post can be given any or all of these flags. A user may reapply or modify flags if they encounter a post more than one time.

Participants are expected to remain **politically and ideologically agnostic** in the submission of these flags. If a post incites controversial discussion, regardless of the moral or political standing of the author, it should be flagged appropriately, even if the participant agrees with the author. 

Posts that express *disapproval* of political candidates, regardless of the candidate’s political position, are inherently controversial and should be flagged appropriately.

Posts that discuss particular kinds of criminal activity or other generally reprehensible behavior are to be flagged at the discretion of the participant.

---

## **3.1: HOW DOES IT WORK?**

Hummingbird observes mutations in the DOM of an element representing the scrollable timeline in order to locate instances of new posts. Whenever a new post is found, its *post-id* is extracted and a request is automatically made to the X API which effectively emulates the participant opening a post in its extended view.

In order to prevent unnecessary requests to the X API, when the extension is initialized, a map representing any recent post exposures will be populated from the Treehouse API. This map also stores any flags applied, so if a participant encounters the same post, any applied flags should be remembered.

### **3.2: REQUEST AUTOMATION**

Whenever X detects a logged-in browser session, it generates a cookie containing a unique *csrf-token*, which is used to authenticate requests to the X API. This is a standard defense against *Cross Site Request Forgery Attacks*; in which a malicious entity forges webpage requests on behalf of a victim. Hummingbird uses this *csrf-token* to send authenticated X API requests on behalf of the participant, which return structured *JSON* data containing post information for every post visible on the X timeline.

See **3.3: JSON OVERVIEW, 4.2: CROSS SITE REQUEST FORGERY** for more information.

Participants are aware of the vulnerabilities surrounding their *csrf-tokens*. The *csrf-token* token is **ONLY** used to fetch post information, and is never stored or sent to the Treehouse API.

**3.3: JSON OVERVIEW**

Each JSON Payload returned from the X API contains, but is not limited to, the following information:

+ **Immutable Post Information:** *post-id, date-created, content, attachments, is-quote, etc.*

+ **Mutable Post Information:** *favorite-count, bookmark-count, top-replies, quote-count, etc.*

+ **Post Relationship Information:** *is-favorited, is-bookmarked, etc.*

+ **Immutable Author Information:** *user-id, date-created, etc.*

+ **Mutable Author Information:** *username, display-name, bio, follower-count, following-count, is-verified, etc.*

+ **Author Relationship Information:** *is-following, is-super-following, etc.*

*Some*, but not all, of this information gets processed and logged.

*See **4.1: PRIVACY, 5.1: DATA COLLECTION** for more information.*

---

### **4.1: PRIVACY AND SECURITY**

Hummingbird participants will receive a single-use invite code that’s required to activate the extension. When a code is consumed, a random, unique *API Key* will be generated server-side and installed into the user’s instance of the extension. This API Key permits traffic from the participant’s instance of the extension.

This API Key gets interpreted server-side as an *observer-id*, which allows classes of *Exposure* events to be attributed to the same participant. The API Key is generated independently of the provided invite code, which lets participants remain anonymous while still allowing users’ Exposure events to be grouped together.

See **5.2: EXPOSURE EVENTS** for more information.

Hummingbird only processes posts that appear on the **For You** timeline. Participants’ *csrf-tokens* are never stored or used to execute malicious scripts. **NO** information about participants is ever logged.

In the public Hummingbird source code, all instances of the Treehouse API url have been redacted and replaced with a generic localhost url.

---

## **5.1: DATA COLLECTION**

The following information, and the following information *only*, is processed and logged to the Treehouse API:

For each **Post:**

+ *post-id,* *content, created-at, is-quote, quote-content, favorite-count, reply-count, retweet-count, bookmark-count, view-count, quote-count, **Quote, Attachments, Author, Top Replies***

For each **Quote:**

+ *Post-id, content, date-created, **Author***

For each **Attachment:**

+ *attachment-type, duration (if video)*

For each **Author:**

+ *user-id, user-name, display-name, bio, created-at, follower-count, following-count, tweet-count, media-tweet-count, is-blue-verified, is-verified*

For each **Reply:**

+ *post-id, content, created-at, is-quote, **Author***

### **5.2: EXPOSURE EVENTS**

An **Exposure** event is classified as any instance of a post or user being presented to a user. Exposure events are used to track *mutable* post metrics and user information, and are logged separately from *immutable* post and user information. To prevent repetitive clusters of Exposures caused by behavior such as repeatedly refreshing the webpage, Post Exposures may only be recorded once per user, while User Exposures may be recorded once per session.

**Mutable** information is any information that is subject to change after an Exposure event, such as a post’s *favorite-count* or a user’s *display-name.* **Immutable** information is any information that is expected to never change, such as a post’s *post-id* or a user’s *user-id.*

If multiple Hummingbird users encounter the same post, performance and engagement metrics can be interpolated by analyzing the distinct Exposure events.
