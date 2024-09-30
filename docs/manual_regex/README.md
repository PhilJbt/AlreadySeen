| [<img src="https://raw.githubusercontent.com/stevenrskelton/flag-icon/master/png/16/country-4x3/us.png" />](README.md) | [<img src="https://raw.githubusercontent.com/stevenrskelton/flag-icon/master/png/16/country-4x3/fr.png" />](README_fr.md) |
| -- | --- |

# 1. What is Regex?

Regex (Regular Expression) is a sequence of characters that defines a search pattern, typically used for pattern matching, searching, and replacing text in strings.\
In the case of _Already Seen_, this allows the user to monitor multiple pages with a single line (and therefore a single database, so that images and/or links from any page will not be treated as new for each different page).\
You can also blacklist certain words, so that the URL will not be monitored if they appear.

# 2. Practical example

In case you would like to monitor the URL **`example.com/?type=movie`** as well as the variations due to the pagination such as **`example.com/?type=movie&page=2`**, but not when you are looking for a specific type of movie like **`example.com/?type=movie&genre=action`**, here the Regex you should write:

> <!---->(?!.*genre=)https:\/\/example\.com\/\?type=movie

This way, a lot of variations like **`example.com/?type=movie&quality=HD`** are taken into account, unless the word *`genre`* appears.
<br/><br/>
On the contrary, if you prefer to exclude anything not expected, there is what you should write:

> <!---->^https:\/\/example\.com\/\?type=movie(&page=\d)?$

# 3. Escaped characters

Why write `https:\/\/example\.com` instead of `https://example.com`? Because some characters are literally used by the Regex.\
For example, the Regex **`page=[0-9]+`** detects:

> The string **`page=`**,
> then **`any digit from 0 to 9`**,
> with at least one repetition.

This way, it is possible to detect **`page=1`** as well as **`page=96`**.

<br/>

> [!TIP]
> I made a Regex tester, which is available at this address:\
> https://philjbt.github.io/AlreadySeen/manual_regex/regex_tester.html?action=example1

[<img src="../res/screen_tester.png" />](https://philjbt.github.io/AlreadySeen/manual_regex/regex_tester.html?action=example1)