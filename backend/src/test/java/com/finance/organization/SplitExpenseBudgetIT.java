package com.finance.organization;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SplitExpenseBudgetIT {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void splitExpenseAttributesSelfAndDependentToBudget() throws Exception {
        MvcResult reg = mockMvc.perform(
                        post("/api/auth/register")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"email":"split@test.com","password":"Abcd1234!"}
                                        """))
                .andExpect(status().isCreated())
                .andReturn();
        String token = JsonPath.read(reg.getResponse().getContentAsString(), "$.token");

        mockMvc.perform(
                        post("/api/cards")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"name":"Visa","lastFourDigits":"","colorHex":"#6366f1","invoiceClosingDay":null}
                                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1));

        mockMvc.perform(
                        post("/api/cards/1/dependents")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"Amor\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1));

        mockMvc.perform(
                        put("/api/settings")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"monthlyIncome\":10000}"))
                .andExpect(status().isOk());

        String today = LocalDate.now().toString();
        mockMvc.perform(
                        post("/api/expenses")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "cardId": 1,
                                          "amount": 1200,
                                          "description": "Viagem",
                                          "expenseDate": "%s",
                                          "spentBySelf": true,
                                          "dependentPersonId": null,
                                          "notes": null,
                                          "installmentCount": 1,
                                          "splits": [
                                            {"spentBySelf": true, "dependentPersonId": null, "amount": 600},
                                            {"spentBySelf": false, "dependentPersonId": 1, "amount": 600}
                                          ]
                                        }
                                        """
                                                .formatted(today)))
                .andExpect(status().isCreated());

        mockMvc.perform(
                        get("/api/dashboard/summary")
                                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.spentSelfInCurrentCalendarMonth").value(600))
                .andExpect(jsonPath("$.spentAllInCurrentCalendarMonth").value(1200))
                .andExpect(jsonPath("$.bySpentBy.SELF").value(600))
                .andExpect(jsonPath("$.bySpentBy['dep:1']").value(600))
                .andExpect(jsonPath("$.remainingBudget").value(9400));
    }

    @Test
    void updateSplitGroupReplacesPartsAndBudget() throws Exception {
        MvcResult reg = mockMvc.perform(
                        post("/api/auth/register")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"email":"split2@test.com","password":"Abcd1234!"}
                                        """))
                .andExpect(status().isCreated())
                .andReturn();
        String token = JsonPath.read(reg.getResponse().getContentAsString(), "$.token");

        MvcResult cardRes = mockMvc.perform(
                        post("/api/cards")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"name":"Visa","lastFourDigits":"","colorHex":"#6366f1","invoiceClosingDay":null}
                                        """))
                .andExpect(status().isCreated())
                .andReturn();
        long cardId = ((Number) JsonPath.read(cardRes.getResponse().getContentAsString(), "$.id")).longValue();

        MvcResult depRes = mockMvc.perform(
                        post("/api/cards/" + cardId + "/dependents")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"Amor\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        long depId = ((Number) JsonPath.read(depRes.getResponse().getContentAsString(), "$.id")).longValue();

        mockMvc.perform(
                        put("/api/settings")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"monthlyIncome\":10000}"))
                .andExpect(status().isOk());

        String today = LocalDate.now().toString();
        String createBody =
                """
                {
                  "cardId": %d,
                  "amount": 1000,
                  "description": "Viagem",
                  "expenseDate": "%s",
                  "spentBySelf": true,
                  "dependentPersonId": null,
                  "notes": null,
                  "installmentCount": 1,
                  "splits": [
                    {"spentBySelf": true, "dependentPersonId": null, "amount": 400},
                    {"spentBySelf": false, "dependentPersonId": %d, "amount": 600}
                  ]
                }
                """
                        .formatted(cardId, today, depId);
        MvcResult createRes = mockMvc.perform(
                        post("/api/expenses")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(createBody))
                .andExpect(status().isCreated())
                .andReturn();
        long expenseId = ((Number) JsonPath.read(createRes.getResponse().getContentAsString(), "$[0].id")).longValue();

        mockMvc.perform(
                        get("/api/dashboard/summary")
                                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.spentSelfInCurrentCalendarMonth").value(400));

        String updateBody =
                """
                {
                  "cardId": %d,
                  "amount": 1000,
                  "description": "Viagem",
                  "expenseDate": "%s",
                  "spentBySelf": true,
                  "dependentPersonId": null,
                  "notes": null,
                  "installmentCount": 1,
                  "splits": [
                    {"spentBySelf": true, "dependentPersonId": null, "amount": 700},
                    {"spentBySelf": false, "dependentPersonId": %d, "amount": 300}
                  ]
                }
                """
                        .formatted(cardId, today, depId);

        mockMvc.perform(
                        put("/api/expenses/" + expenseId)
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(updateBody))
                .andExpect(status().isOk());

        mockMvc.perform(
                        get("/api/dashboard/summary")
                                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.spentSelfInCurrentCalendarMonth").value(700))
                .andExpect(jsonPath("$.bySpentBy['dep:" + depId + "']").value(300));
    }
}
