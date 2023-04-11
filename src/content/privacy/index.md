pageTitle: Privacy Policy
shortTitle: Privacy Policy
suppressTitle: true

The Jurism reference management system is an effort to provide the
benefits of modern reference management technology to lawyers and
multilingual scholars. None of the project's tools or websites impose
advertising on the user, user data is not shared with third parties,
and where information is collected, it is deleted after serving its
purpose. See below for specifics on information collected, and the
purpose of collection.

# Special Note on Cookies

Cookies are of particular concern to privacy-conscious users, so a
special note on the way they are handled by the Jurism connectors is
in order. Websites visited by the browser often set cookies for
various purposes of their own, including the imposition of paywalls
and other content restrictions. The Jurism Connector plugins have no
control over these uses of cookies. However, in order to extract
bibliographic information from pages visited in the browser, the
Jurism Connectors must make an accessible and fully rendered image
of the page internally. In order to to this, cookies associated with
the page are replicated, together to other featurs of the page.
This access to cookie data is done for that limited purpose only,
the copied data is ephemeral, does not leave the user's computer,
and is not copied or otherwise shared with third parties.

# System Elements

The system consists of six elements:

* a **library client** installed on the user's computer;
* a **distribution server** that supplies automatic updates to the
  library client.
* a **debugging service** to which users may voluntarily submit logs of
  the internal operation of the library client for examination by the
  Jurism developers;
* **connectors** that enable web browsers to save bibliographic details
  from web pages to the library client;
* **integration plugins** that support one-click insertion of references
  into word processor documents;
* **Zotero storage**, an optional third-party service to which users may
  syncronize the content of the library client.

The collection and disposition of information in each of these elements
is as follows:

## Library Client

The library client itself is a standalone tool installed on the user's
computer that is as secure to outside access as the computer's operating
system.

## Distribution Server

The library client is updated from time to time with bugfixes and new
features. Unless disabled by the user, these updates operate by the
library client polling a distribution server once per day, and
installing updates when a fresh update is detected. These polling
transactions are logged on the distributon server with their
originating IP address. This information may be used to identify the
number of unique installations of the library client exist in the
field. IP addresses and other details contained in the log files are
not and will not be shared with third parties, and the information is
deleted after one month.

## Debugging Service

For debugging purposes, the Jurism maintainers may invite a user to
submit a "Debugging Report" logging the internal state of the library
client during a problematic operation. These records contain no
identifying information of the individual user, are not shared with
third parties, and are deleted after two weeks.

## Connectors

The browser connectors pass information on two channels. First, they
rely on the library client to provide "translator" code to extract
bibliographic information from web pages, and in return send
bibliographic records to the library client for storage. These
transactions take place within the user's computer. Second, the
connectors support word processor integration with the Google Docs
service, which has a separate Privacy Policy.

## Integration Plugins

The word processor integration plugins communicate with the
library client to support one-click insertion of references
in user documents. These transactions take place inside the
user's computer, and do not involve collection of data of any kind.

## Zotero Storage

The cloud sync service Zotero Storage is maintained by the
unaffiliated upstream parent of the Jurism project. The Zotero privacy
policy is available at: https://www.zotero.org/support/privacy.
