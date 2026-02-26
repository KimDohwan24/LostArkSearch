package com.lostark.search;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.util.UriComponentsBuilder;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/characters")
@CrossOrigin(origins = "http://localhost:5173")
public class CharacterController {

    @Value("${lostark.api.key:}")
    private String apiKey;

    private final String API_BASE = "https://developer-lostark.game.onstove.com";
    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/{name}/full")
    public ResponseEntity<Object> getFullData(@PathVariable String name) {
        System.out.println("[SERVER] 검색 요청: " + name);

        try {
            if (apiKey == null || apiKey.trim().isEmpty()) {
                System.err.println("[SERVER ERROR] API 키가 설정되지 않음!");
                return ResponseEntity.status(500).body("API 키가 application.properties에 설정되어 있지 않습니다.");
            }

            // 1. 프로필 조회 (성공해야 함)
            ResponseEntity<Object> profileRes = callApi(API_BASE + "/armories/characters/{name}/profiles", name);
            if (!profileRes.getStatusCode().is2xxSuccessful()) {
                return profileRes; // 404나 401 등을 그대로 반환
            }

            Map<String, Object> result = new HashMap<>();
            result.put("profile", profileRes.getBody());

            // 2. 다른 데이터들 (실패해도 진행)
            result.put("skills", getBody(callApi(API_BASE + "/armories/characters/{name}/combat-skills", name)));
            result.put("gems", getBody(callApi(API_BASE + "/armories/characters/{name}/gems", name)));
            result.put("arkpassive", getBody(callApi(API_BASE + "/armories/characters/{name}/arkpassive", name)));
            result.put("siblings", getBody(callApi(API_BASE + "/characters/{name}/siblings", name)));
            result.put("engravings", getBody(callApi(API_BASE + "/armories/characters/{name}/engravings", name)));
            result.put("cards", getBody(callApi(API_BASE + "/armories/characters/{name}/cards", name)));

            try {
                result.put("arkgrid", getBody(callApi(API_BASE + "/armories/characters/{name}/arkgrid", name)));
            } catch (Exception e) {
                System.out.println("[SERVER] arkgrid API 호출 실패: " + e.getMessage());
                result.put("arkgrid", null);
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("서버 오류: " + e.getMessage());
        }
    }

    private Object getBody(ResponseEntity<Object> res) {
        return (res != null && res.getStatusCode().is2xxSuccessful()) ? res.getBody() : null;
    }

    private ResponseEntity<Object> callApi(String urlTemplate, String name) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "bearer " + apiKey.trim());
        headers.setContentType(new MediaType("application", "json", StandardCharsets.UTF_8));
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            URI uri = UriComponentsBuilder.fromHttpUrl(urlTemplate)
                    .buildAndExpand(name)
                    .encode()
                    .toUri();

            return restTemplate.exchange(uri, HttpMethod.GET, entity, Object.class);
        } catch (HttpStatusCodeException e) {
            return ResponseEntity.status(e.getStatusCode()).body(e.getResponseBodyAsString());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("API 호출 중 오류: " + e.getMessage());
        }
    }
}
