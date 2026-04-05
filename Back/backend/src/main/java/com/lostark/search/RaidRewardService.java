package com.lostark.search;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RaidRewardService {

    private List<Map<String, Object>> allRaids = new ArrayList<>();

    @PostConstruct
    public void init() {
        try {
            ObjectMapper mapper = new ObjectMapper();
            ClassPathResource resource = new ClassPathResource("raids.json");
            try (InputStream is = resource.getInputStream()) {
                allRaids = mapper.readValue(is, new TypeReference<List<Map<String, Object>>>() {});
            }
            System.out.println("[RaidRewardService] 레이드 데이터 로드 완료: " + allRaids.size() + "개");
        } catch (IOException e) {
            System.err.println("[RaidRewardService] 레이드 데이터 로드 실패: " + e.getMessage());
        }
    }

    public List<Map<String, Object>> getAllRaids() {
        return allRaids;
    }

    public List<Map<String, Object>> getAvailableRaids(int itemLevel) {
        return allRaids.stream()
                .filter(raid -> {
                    Number level = (Number) raid.get("level");
                    return level != null && itemLevel >= level.intValue();
                })
                .collect(Collectors.toList());
    }

    public List<Map<String, Object>> getRaidsByName(String name) {
        return allRaids.stream()
                .filter(raid -> {
                    String raidName = (String) raid.get("name");
                    return raidName != null && raidName.equals(name);
                })
                .collect(Collectors.toList());
    }

    public Map<String, Object> getRaidSummary(String name) {
        List<Map<String, Object>> raids = getRaidsByName(name);
        if (raids.isEmpty()) {
            return null;
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("name", name);
        summary.put("totalGold", raids.stream()
                .mapToInt(r -> ((Number) r.getOrDefault("gold", 0)).intValue())
                .sum());
        summary.put("steps", raids.size());
        summary.put("minLevel", raids.stream()
                .mapToInt(r -> ((Number) r.get("level")).intValue())
                .min()
                .orElse(0));
        summary.put("playerCount", raids.isEmpty() ? 0 : raids.get(0).get("playerCount"));
        summary.put("raids", raids);

        return summary;
    }

    public List<String> getAllRaidNames() {
        return allRaids.stream()
                .map(r -> (String) r.get("name"))
                .distinct()
                .collect(Collectors.toList());
    }
}
