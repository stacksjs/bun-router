import type { RequestItem } from '../store/collectionsStore'

export type Language = 'javascript' | 'python' | 'curl' | 'php' | 'go' | 'ruby' | 'java'

export const supportedLanguages = [
  { id: 'javascript', name: 'JavaScript (Fetch)', icon: 'i-logos-javascript' },
  { id: 'javascript-axios', name: 'JavaScript (Axios)', icon: 'i-logos-javascript' },
  { id: 'python', name: 'Python (Requests)', icon: 'i-logos-python' },
  { id: 'curl', name: 'cURL', icon: 'i-carbon-terminal' },
  { id: 'php', name: 'PHP', icon: 'i-logos-php' },
  { id: 'go', name: 'Go', icon: 'i-logos-go' },
  { id: 'ruby', name: 'Ruby', icon: 'i-logos-ruby' },
  { id: 'java', name: 'Java', icon: 'i-logos-java' }
]

function escapeQuotes(str: string, quoteChar: string = "'"): string {
  if (quoteChar === "'") {
    return str.replace(/'/g, "\\'")
  } else if (quoteChar === '"') {
    return str.replace(/"/g, '\\"')
  }
  return str
}

function formatHeaders(headers: Record<string, string>, language: string): string {
  const headerEntries = Object.entries(headers)
  if (headerEntries.length === 0) return ''

  switch (language) {
    case 'javascript':
      return `headers: {
${headerEntries.map(([key, value]) => `    '${escapeQuotes(key)}': '${escapeQuotes(value)}'`).join(',\n')}
  }`
    case 'javascript-axios':
      return `headers: {
${headerEntries.map(([key, value]) => `    '${escapeQuotes(key)}': '${escapeQuotes(value)}'`).join(',\n')}
  }`
    case 'python':
      return `headers = {
${headerEntries.map(([key, value]) => `    '${escapeQuotes(key)}': '${escapeQuotes(value)}'`).join(',\n')}
}`
    case 'curl':
      return headerEntries.map(([key, value]) => `-H '${escapeQuotes(key)}: ${escapeQuotes(value)}'`).join(' \\\n  ')
    case 'php':
      return `$headers = array(
${headerEntries.map(([key, value]) => `    '${escapeQuotes(key)}' => '${escapeQuotes(value)}'`).join(',\n')}
);`
    case 'go':
      return `headers := map[string]string{
${headerEntries.map(([key, value]) => `    "${escapeQuotes(key, '"')}": "${escapeQuotes(value, '"')}"`).join(',\n')}
}`
    case 'ruby':
      return `headers = {
${headerEntries.map(([key, value]) => `  '${escapeQuotes(key)}' => '${escapeQuotes(value)}'`).join(',\n')}
}`
    case 'java':
      return `Map<String, String> headers = new HashMap<>();
${headerEntries.map(([key, value]) => `headers.put("${escapeQuotes(key, '"')}", "${escapeQuotes(value, '"')}");`).join('\n')}`
    default:
      return ''
  }
}

export function generateCode(request: RequestItem, language: string): string {
  const { method, url, headers, body } = request
  const hasBody = !!body && ['POST', 'PUT', 'PATCH'].includes(method)

  switch (language) {
    case 'javascript':
      return `// JavaScript Fetch API
${hasBody ? `const requestBody = ${body};\n` : ''}${Object.keys(headers).length > 0 ? `const headers = {
${Object.entries(headers).map(([key, value]) => `  '${escapeQuotes(key)}': '${escapeQuotes(value)}'`).join(',\n')}
};\n` : ''}
fetch('${escapeQuotes(url)}', {
  method: '${method}'${Object.keys(headers).length > 0 ? ',\n  headers' : ''}${hasBody ? `,
  body: JSON.stringify(requestBody)` : ''}
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`

    case 'javascript-axios':
      return `// JavaScript Axios
import axios from 'axios';

${hasBody ? `const requestBody = ${body};\n` : ''}${Object.keys(headers).length > 0 ? `const headers = {
${Object.entries(headers).map(([key, value]) => `  '${escapeQuotes(key)}': '${escapeQuotes(value)}'`).join(',\n')}
};\n` : ''}
axios({
  method: '${method.toLowerCase()}',
  url: '${escapeQuotes(url)}'${Object.keys(headers).length > 0 ? ',\n  headers' : ''}${hasBody ? `,
  data: requestBody` : ''}
})
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.error('Error:', error);
  });`

    case 'python':
      return `# Python Requests
import requests

${Object.keys(headers).length > 0 ? `headers = {
${Object.entries(headers).map(([key, value]) => `    '${escapeQuotes(key)}': '${escapeQuotes(value)}'`).join(',\n')}
}
` : ''}${hasBody ? `data = ${body.replace(/"/g, "'")}\n` : ''}
response = requests.${method.toLowerCase()}('${escapeQuotes(url)}'${Object.keys(headers).length > 0 ? ', headers=headers' : ''}${hasBody ? ', json=data' : ''})

# Print response
print(response.status_code)
print(response.json())`

    case 'curl':
      return `# cURL Command
curl -X ${method} \\
  ${Object.keys(headers).length > 0 ? `${Object.entries(headers).map(([key, value]) => `-H '${escapeQuotes(key)}: ${escapeQuotes(value)}'`).join(' \\\n  ')} \\` : ''}
  ${hasBody ? `-d '${escapeQuotes(body)}' \\` : ''}
  '${escapeQuotes(url)}'`

    case 'php':
      return `<?php
// PHP cURL
$curl = curl_init();

${Object.keys(headers).length > 0 ? `$headers = array(
${Object.entries(headers).map(([key, value]) => `    '${escapeQuotes(key)}' => '${escapeQuotes(value)}'`).join(',\n')}
);
` : ''}
curl_setopt_array($curl, array(
  CURLOPT_URL => '${escapeQuotes(url)}',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CUSTOMREQUEST => '${method}'${Object.keys(headers).length > 0 ? `,
  CURLOPT_HTTPHEADER => array_map(function($key, $value) {
    return "$key: $value";
  }, array_keys($headers), $headers)` : ''}${hasBody ? `,
  CURLOPT_POSTFIELDS => '${escapeQuotes(body)}'` : ''}
));

$response = curl_exec($curl);
$err = curl_error($curl);

curl_close($curl);

if ($err) {
  echo "cURL Error: " . $err;
} else {
  echo $response;
}
?>`

    case 'go':
      return `// Go
package main

import (
	"fmt"
	"io/ioutil"
	"net/http"
	${hasBody ? `"strings"` : ''}
)

func main() {
	${hasBody ? `requestBody := \`${body}\`` : ''}

	${Object.keys(headers).length > 0 ? `headers := map[string]string{
${Object.entries(headers).map(([key, value]) => `		"${escapeQuotes(key, '"')}": "${escapeQuotes(value, '"')}"`).join(',\n')}
	}
	` : ''}
	client := &http.Client{}
	req, err := http.NewRequest("${method}", "${escapeQuotes(url, '"')}", ${hasBody ? 'strings.NewReader(requestBody)' : 'nil'})
	if err != nil {
		fmt.Println("Error creating request:", err)
		return
	}

	${Object.keys(headers).length > 0 ? `// Add headers
	for key, value := range headers {
		req.Header.Add(key, value)
	}
	` : ''}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Error sending request:", err)
		return
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		fmt.Println("Error reading response:", err)
		return
	}

	fmt.Println("Status:", resp.Status)
	fmt.Println("Response:", string(body))
}`

    case 'ruby':
      return `# Ruby
require 'net/http'
require 'uri'
require 'json'

uri = URI.parse('${escapeQuotes(url)}')
${Object.keys(headers).length > 0 ? `headers = {
${Object.entries(headers).map(([key, value]) => `  '${escapeQuotes(key)}' => '${escapeQuotes(value)}'`).join(',\n')}
}
` : ''}
http = Net::HTTP.new(uri.host, uri.port)
${url.startsWith('https') ? 'http.use_ssl = true' : ''}

request = Net::HTTP::${method.charAt(0) + method.slice(1).toLowerCase()}.new(uri.request_uri)
${Object.keys(headers).length > 0 ? `headers.each do |key, value|
  request[key] = value
end
` : ''}${hasBody ? `request.body = '${escapeQuotes(body)}'
` : ''}
response = http.request(request)

puts "Status: #{response.code}"
puts "Response: #{response.body}"`

    case 'java':
      return `// Java HttpClient (Java 11+)
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;

public class HttpRequestExample {
    public static void main(String[] args) {
        try {
            HttpClient client = HttpClient.newHttpClient();

            ${Object.keys(headers).length > 0 ? `Map<String, String> headers = new HashMap<>();
${Object.entries(headers).map(([key, value]) => `            headers.put("${escapeQuotes(key, '"')}", "${escapeQuotes(value, '"')}");`).join('\n')}
            ` : ''}
            ${hasBody ? `String requestBody = "${escapeQuotes(body, '"')}";
            ` : ''}
            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create("${escapeQuotes(url, '"')}"))
                .method("${method}", ${hasBody ? 'HttpRequest.BodyPublishers.ofString(requestBody)' : 'HttpRequest.BodyPublishers.noBody()'});

            ${Object.keys(headers).length > 0 ? `// Add headers
            headers.forEach((name, value) -> {
                requestBuilder.header(name, value);
            });
            ` : ''}
            HttpRequest request = requestBuilder.build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            System.out.println("Status: " + response.statusCode());
            System.out.println("Response: " + response.body());

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}`

    default:
      return '// Language not supported'
  }
}
